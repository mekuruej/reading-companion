export default function MekuruReadingGroupsPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#2f2a24]">
      <main className="mx-auto max-w-5xl px-6 py-16 md:py-24">

        {/* Hero */}
        <section className="space-y-6">
          <p className="text-sm uppercase tracking-[0.25em] text-[#8a7f71]">Planned Guided Reading Cohorts</p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Guided reading cohorts for adults exploring authentic Japanese literature.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[#4f473d]">
            We are developing small, teacher-supported cohorts built around reading Japanese together. Enrollment is not open yet; each cohort depends on confirmation of the selected book and any necessary publisher permission.
          </p>
        </section>

        {/* What reading groups are */}
        <section className="mt-16 rounded-[2rem] border border-[#d9d1c3] bg-white p-8 shadow-sm md:p-10">
          <div className="space-y-5">
            <h2 className="text-3xl font-semibold">What we are planning</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              The planned cohorts would help adult learners become more independent readers through guided reading, pronunciation, vocabulary, grammar, and comprehension support.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              Participants would prepare a manageable section before each session. Guided reading would then give us time to work directly through the Japanese together.
            </p>
            <p className="text-lg leading-8 text-[#4f473d]">
              You would not need to understand everything in advance. The teacher would help you work through difficult language in the text and build confidence for your own reading.
            </p>
          </div>
        </section>

        {/* How groups work */}
        <section className="mt-16 space-y-10">
          <h2 className="text-3xl font-semibold">The proposed guided-reading format</h2>

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
                Work through selected passages with teacher modelling and support for readings, pronunciation, vocabulary, grammar, and meaning.
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
            The book, level, schedule, duration, and fees would be announced for each cohort before enrollment opens.
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
            Private Japanese reading coaching is currently available. Paid guided-reading cohorts are planned separately and are not yet open for enrollment.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            The free Facebook community is a place for questions, connection, and updates. It is separate from paid private lessons and planned cohorts.
          </p>

          <p className="text-lg leading-8 text-[#4f473d]">
            Reading retreats remain a longer-term possibility.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-[2rem] border border-[#d9d1c3] bg-white p-8 shadow-sm md:p-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold">Stay connected as the cohorts take shape.</h2>
            <p className="text-lg leading-8 text-[#4f473d]">
              Follow MEKURU for updates about planned cohorts, or ask about private Japanese reading coaching that is currently available.
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
