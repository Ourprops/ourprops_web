#!/usr/bin/env bash
# Sets up the document converter on Google Cloud Run (docs/admin.md, section 7). Run it yourself, signed in to gcloud
# as an owner of the project: `gcloud auth login`, then `./converter/deploy.sh`. Each step can be run again safely;
# one that already exists is left as it is, apart from the deploy, which rolls out the image and flags below again.
#
# What it builds:
#   - the Gotenberg image, copied into Artifact Registry and deployed by digest, so a change on Docker Hub can't
#     change what runs;
#   - a network with no route out (no Cloud NAT, and a firewall rule denying all egress), which all of the service's
#     outbound traffic goes into, so a file that takes over LibreOffice can't send anything anywhere;
#   - the service: private (IAM only), one file per instance, the same Gotenberg flags as converter/compose.yaml;
#   - a service account that may only call the converter, and workload identity federation so that the ourprops-web
#     production deployment on Vercel, and nothing else, can get an ID token for it. No key is created.
set -euo pipefail

PROJECT_ID="vast-zodiac-448118-s0"
# Supabase is in eu-west-1 (Ireland). Google has no Irish region; Belgium is the nearest.
REGION="europe-west1"

SERVICE="document-converter"
REPOSITORY="converter"
GOTENBERG_VERSION="8.39.0"
NETWORK="converter-net"
SUBNET="converter-subnet"
CALLER_ACCOUNT="converter-caller"
POOL="vercel"
PROVIDER="vercel"

VERCEL_TEAM="ourprops"
VERCEL_PROJECT="ourprops-web"
VERCEL_SUBJECT="owner:${VERCEL_TEAM}:project:${VERCEL_PROJECT}:environment:production"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/gotenberg:${GOTENBERG_VERSION}"
CALLER_EMAIL="${CALLER_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

step() { printf '\n== %s\n' "$1"; }
exists() { "$@" >/dev/null 2>&1; }

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

step "Turning on the APIs"
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com compute.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

step "Copying Gotenberg ${GOTENBERG_VERSION} into Artifact Registry"
exists gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" ||
  gcloud artifacts repositories create "$REPOSITORY" --repository-format=docker --location="$REGION" \
    --description="The document converter's image"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
# Cloud Run runs amd64, whatever this machine is
docker pull --platform linux/amd64 "gotenberg/gotenberg:${GOTENBERG_VERSION}"
docker tag "gotenberg/gotenberg:${GOTENBERG_VERSION}" "$IMAGE"
docker push "$IMAGE"
DIGEST="$(gcloud artifacts docker images describe "$IMAGE" --format='value(image_summary.digest)')"
echo "Deploying ${IMAGE%:*}@${DIGEST}"

step "A network with no way out"
exists gcloud compute networks describe "$NETWORK" ||
  gcloud compute networks create "$NETWORK" --subnet-mode=custom
# Direct VPC egress needs a /26 or larger
exists gcloud compute networks subnets describe "$SUBNET" --region="$REGION" ||
  gcloud compute networks subnets create "$SUBNET" --network="$NETWORK" --region="$REGION" --range=10.8.0.0/26
# There is no Cloud NAT, so nothing reaches the internet already; this rule also stops traffic inside the network
exists gcloud compute firewall-rules describe "${NETWORK}-deny-egress" ||
  gcloud compute firewall-rules create "${NETWORK}-deny-egress" --network="$NETWORK" \
    --direction=EGRESS --action=DENY --rules=all --destination-ranges=0.0.0.0/0 --priority=1000

step "Deploying the converter"
# Only the LibreOffice route; no webhooks, URL downloads or fetches from inside documents; LibreOffice restarts after
# every file. --args replaces the image's command, as `command:` does in converter/compose.yaml.
gcloud run deploy "$SERVICE" \
  --image="${IMAGE%:*}@${DIGEST}" \
  --region="$REGION" \
  --no-allow-unauthenticated \
  --ingress=all \
  --network="$NETWORK" --subnet="$SUBNET" --vpc-egress=all-traffic \
  --execution-environment=gen2 \
  --port=3000 \
  --cpu=1 --memory=2Gi --cpu-boost \
  --concurrency=1 --min-instances=0 --max-instances=2 \
  --timeout=60 \
  --args="gotenberg,--chromium-disable-routes,--pdfengines-disable-routes,--webhook-disable,--api-disable-download-from,--libreoffice-deny-public-ips,--libreoffice-deny-private-ips,--libreoffice-restart-after=1,--libreoffice-max-queue-size=5,--api-timeout=60s,--api-body-limit=25MB"
SERVICE_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"

step "The account the app calls the converter as"
exists gcloud iam service-accounts describe "$CALLER_EMAIL" ||
  gcloud iam service-accounts create "$CALLER_ACCOUNT" --display-name="Calls the document converter"
# The only thing it may do: call this one service
gcloud run services add-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member="serviceAccount:${CALLER_EMAIL}" --role=roles/run.invoker >/dev/null

step "Letting the Vercel production deployment use it, and nothing else"
exists gcloud iam workload-identity-pools describe "$POOL" --location=global ||
  gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="Vercel"
# Google refuses any token that isn't from this team's issuer, for this audience, and for this project's production
# environment: preview deployments and the team's other projects get nothing.
exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --issuer-uri="https://oidc.vercel.com/${VERCEL_TEAM}" \
    --allowed-audiences="https://vercel.com/${VERCEL_TEAM}" \
    --attribute-mapping="google.subject=assertion.sub" \
    --attribute-condition="assertion.sub == '${VERCEL_SUBJECT}'"
# The app asks IAM for an ID token for the converter's URL as this account. To check before relying on it: that
# roles/iam.serviceAccountOpenIdTokenCreator is the role that allows generateIdToken for a federated principal.
gcloud iam service-accounts add-iam-policy-binding "$CALLER_EMAIL" \
  --role=roles/iam.serviceAccountOpenIdTokenCreator \
  --member="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/subject/${VERCEL_SUBJECT}" >/dev/null

step "Checking it"
printf 'Without a token (expect 403): '
curl -s -o /dev/null -w '%{http_code}\n' "${SERVICE_URL}/health"
printf 'With your own identity token (expect 200): '
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(gcloud auth print-identity-token)" "${SERVICE_URL}/health"

step "Set these in Vercel (Production only)"
cat <<EOF
DOCUMENT_CONVERTER_URL=${SERVICE_URL}
GCP_PROJECT_NUMBER=${PROJECT_NUMBER}
GCP_WORKLOAD_IDENTITY_POOL_ID=${POOL}
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=${PROVIDER}
GCP_SERVICE_ACCOUNT_EMAIL=${CALLER_EMAIL}
EOF
