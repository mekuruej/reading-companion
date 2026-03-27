export default function MekuruReadingGroupsPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#2f2a24]">
      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">

        {/* Hero */}
        <section className="space-y-6">
          <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Reading Groups</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Reading groups for learners who want to work through real Japanese texts together.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[#4f473d]">
            Challenge yourself with small sections of real text, come with questions, and build confidence by reading with learners around your level.
          </p>
        </section>

        {/* What reading groups are */}
        <section className="mt-16 rounded-[2rem] border border-[#d9d1c3] bg-white p-8 shadow-sm md:p-10">
          <div className="space-y-5">
            <h2 className="text-3xl font-semibold">What reading groups are</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              Reading groups are not passive lessons. They are a space where you try first, and then work through what was difficult together.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              Before each session, you prepare a small section on your own. For lower levels, this might be as little as one page.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              You do not need to understand everything. The goal is to notice what was difficult and bring that into the discussion.
            </p>
          </div>
        </section>

        {/* How groups work */}
        <section className="mt-16 space-y-10">
          <h2 className="text-3xl font-semibold">How reading groups work</h2>

          <div className="grid gap-6 md:grid-cols-2">

            <div className="rounded-[1.5rem] border border-[#d9d1c3] bg-white p-6">
              <h3 className="text-xl font-medium">Pre read</h3>
              <p className="mt-3 leading-7 text-[#4f473d]">
                Prepare a small section on your own. Look up words, notice what is unclear, and come with questions.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#d9d1c3] bg-white p-6">
              <h3 className="text-xl font-medium">Read together</h3>
              <p className="mt-3 leading-7 text-[#4f473d]">
                We read through the section together with minimal stopping to build a sense of flow.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#d9d1c3] bg-white p-6">
              <h3 className="text-xl font-medium">Look back</h3>
              <p className="mt-3 leading-7 text-[#4f473d]">
                We return to difficult parts, break them down, and clarify what did not make sense.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#d9d1c3] bg-white p-6">
              <h3 className="text-xl font-medium">Discuss</h3>
              <p className="mt-3 leading-7 text-[#4f473d]">
                We talk about the story so reading becomes understanding, not just translation.
              </p>
            </div>

          </div>

          <p className="text-lg leading-8 text-[#4f473d]">
            Groups are organized by level, and pacing is kept realistic so you can consistently prepare and engage with the text.
          </p>
        </section>

        {/* Tools note */}
        <section className="mt-16 rounded-[2rem] border border-[#d9d1c3] bg-[#f3ede2] p-8 shadow-sm md:p-10">
          <div className="space-y-5">
            <h2 className="text-3xl font-semibold">A note on tools</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              Looking up words in a dictionary is completely fine and often helpful.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              However, it is strongly recommended not to use a translator for full sentences before discussion. That process removes valuable learning.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              During reading, feel free to ask for readings. To keep things moving smoothly, the teacher is there to support you.
            </p>
          </div>
        </section>

        {/* Groups + future */}
        <section className="mt-16 space-y-6">
          <h2 className="text-3xl font-semibold">Groups and future plans</h2>

          <p className="text-lg leading-8 text-[#4f473d]">
            The first group will be beginner friendly. More levels will be added over time as the community grows.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            Study sessions are also available for learners around JLPT N4 and above.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            In the future, reading retreats will offer a deeper, shared reading experience.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-[2rem] border border-[#d9d1c3] bg-white p-8 shadow-sm md:p-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold">You do not have to continue struggling alone.</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              Working through texts with others can change the experience completely.
            </p>
            <div className="pt-2 flex gap-3">
              <button className="rounded-full border border-[#b6ab99] px-5 py-3 text-sm hover:bg-[#efe8dc]">
                Reading Groups
              </button>
              <button className="rounded-full border border-[#b6ab99] px-5 py-3 text-sm hover:bg-[#efe8dc]">
                Facebook
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
