import { ArrowRight, CircleAlert, CircleCheck, CirclePlus } from "lucide-react"
import Link from "next/link"

import type { TodoItem } from "@/lib/owner/dashboard"
import { cn } from "@/lib/utils"

const TONES = {
    waiting: { icon: CircleAlert, className: "text-warning" },
    ready: { icon: CircleCheck, className: "text-success" },
    start: { icon: CirclePlus, className: "text-primary" },
} as const

// Everything that needs the owner, in one place, each with the one thing to tap. Empty means all caught up.
export function TodoList({ todos }: { todos: TodoItem[] }) {
    if (todos.length === 0) {
        return (
            <section aria-labelledby="todo-title" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <CircleCheck className="size-6 shrink-0 text-success" aria-hidden />
                <div>
                    <h2 id="todo-title" className="font-medium">
                        You&apos;re all caught up
                    </h2>
                    <p className="text-sm text-copy">Nothing needs you right now. We&apos;ll let you know here if it does.</p>
                </div>
            </section>
        )
    }

    return (
        <section aria-labelledby="todo-title" className="grid gap-3">
            <h2 id="todo-title" className="font-medium">
                To do
            </h2>
            <ul className="grid gap-3">
                {todos.map((todo) => {
                    const { icon: Icon, className } = TONES[todo.tone]
                    return (
                        <li key={todo.key}>
                            <Link
                                href={todo.href}
                                className={cn(
                                    "flex gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted",
                                    todo.tone === "waiting" ? "border-warning" : "border-border"
                                )}
                            >
                                <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-hidden />
                                <span className="grid min-w-0 flex-1 gap-1">
                                    <span className="font-medium">{todo.title}</span>
                                    <span className="text-sm text-copy wrap-anywhere">{todo.text}</span>
                                    <span className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                                        {todo.action} <ArrowRight size={14} aria-hidden />
                                    </span>
                                </span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
