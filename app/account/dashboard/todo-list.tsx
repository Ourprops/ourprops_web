import { ArrowRight, CircleAlert, CircleCheck, CirclePlus } from "lucide-react"
import Link from "next/link"

import { CaughtUpIllustration } from "@/components/owner/illustrations"
import type { TodoItem } from "@/lib/owner/dashboard"
import { cn } from "@/lib/utils"

const TONES = {
    waiting: { icon: CircleAlert, iconClass: "text-secondary", edge: "before:bg-secondary" },
    ready: { icon: CircleCheck, iconClass: "text-success", edge: "before:bg-success" },
    start: { icon: CirclePlus, iconClass: "text-primary", edge: "before:bg-primary/40" },
} as const

// Everything that needs the owner, in one place, each with the one thing to tap. Empty means all caught up.
export function TodoList({ todos }: { todos: TodoItem[] }) {
    if (todos.length === 0) {
        return (
            <section
                aria-labelledby="todo-title"
                className="animate-rise block-panel flex items-center gap-4 bg-block-mint p-6 motion-reduce:animate-none"
                style={{ animationDelay: "80ms" }}
            >
                <CaughtUpIllustration className="size-14 shrink-0" />
                <div>
                    <h2 id="todo-title" className="text-lg font-bold tracking-tight text-ink">
                        You&apos;re all caught up
                    </h2>
                    <p className="text-sm text-ink/75">Nothing needs you right now. We&apos;ll tell you here if it does.</p>
                </div>
            </section>
        )
    }

    return (
        <section aria-labelledby="todo-title" className="animate-rise grid gap-3 motion-reduce:animate-none" style={{ animationDelay: "80ms" }}>
            <div className="flex items-baseline gap-2">
                <h2 id="todo-title" className="text-xl font-bold tracking-tight text-ink">
                    To do
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-ink tabular-nums">{todos.length}</span>
            </div>
            <ul className="grid gap-2.5">
                {todos.map((todo) => {
                    const { icon: Icon, iconClass, edge } = TONES[todo.tone]
                    return (
                        <li key={todo.key}>
                            <Link
                                href={todo.href}
                                className={cn(
                                    "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5 transition-all duration-150 sm:p-5 sm:pl-6",
                                    "before:absolute before:inset-y-0 before:left-0 before:w-1",
                                    "hover:-translate-y-px hover:border-ink/25 hover:shadow-[0_16px_40px_-24px_rgba(11,30,51,0.4)] motion-reduce:hover:translate-y-0",
                                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:items-center",
                                    edge
                                )}
                            >
                                <span className="flex min-w-0 flex-1 gap-3">
                                    <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden />
                                    <span className="grid min-w-0 gap-0.5">
                                        <span className="font-semibold text-ink">{todo.title}</span>
                                        <span className="text-sm text-copy wrap-anywhere">{todo.text}</span>
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        "flex h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-full px-4 text-sm font-semibold transition-colors sm:self-center",
                                        todo.tone === "waiting" || todo.tone === "ready"
                                            ? "bg-ink text-white group-hover:bg-ink/90"
                                            : "bg-ink/5 text-ink group-hover:bg-ink/10"
                                    )}
                                >
                                    {todo.action}
                                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" aria-hidden />
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
