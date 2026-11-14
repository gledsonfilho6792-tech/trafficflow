type Props = {
  title: string
  description: string
}

export default function SectionPlaceholder({
  title,
  description,
}: Props) {
  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8">
          <p className="text-sm text-zinc-500">
            Traffic Flow
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            {description}
          </p>
        </div>

        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0d0f13]">
          <p className="text-sm text-zinc-600">
            Esta área será construída nas próximas etapas.
          </p>
        </div>
      </div>
    </main>
  )
}