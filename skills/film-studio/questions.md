# The questions (step 1)

Claude sends the block between the two `---` lines as ONE message, word for word, after the
preflight. It leaves out any question the person has already answered, keeps the numbers of the
rest, and accepts "go" as yes to every default in [brackets]. Edit this file to change the
questions; keep them numbered, one short paragraph each, with a default.

---

Before I start, nine quick questions about the film. Answer only the ones you care about; "go" takes every default in [brackets].

1. **The film.** What happens, in a sentence or two? A story, a place, a moment, a product, an idea.
2. **The feeling.** What should someone feel or understand when it ends? [I'll suggest one]
3. **Length and screen.** How long, and where will it play? [30 s, 16:9 at 1080p, 24 fps] (9:16 for Shorts and Reels)
4. **Look.** Photoreal 3D, stylized 3D, illustrated, motion graphics and type, filmed-looking AI footage, or a mix? Any reference images or links? [I'll choose from your idea and show you stills first]
5. **Who and what is in it.** People, animals, creatures, products, real places? [no characters] (Real people, logos and products only from photos or files you give me.)
6. **Words.** Narration that I write, your exact words, or none? Any on-screen text or title? [no narration, a title at the end]
7. **Sound.** Generated music, a synthesized score, sound design only, or your own track? If narrated, a voice? [generated music and sound effects; voice Charon]
8. **Your material.** Photos, clips, logos, fonts or Blender files I should use? [none]
9. **Budget.** The most to spend on AI images and video, and how long renders may run? [$5, overnight is fine]

Reply with just the numbers you want to change, like "1: a lighthouse keeper's last night. 3: 45 s, 9:16".

---

## Follow-ups (only when needed)

- **The film is unclear** (one word, or two very different ideas): offer two or three one-line
  takes on it and ask which one. Don't ask anything else in that message.
- **Generated media wanted but the doctor found no Gemini key**: "To make AI images, video, voice
  or music, add your Gemini API key to a file named `.env` in `<$MV path>`, one line:
  `GEMINI_API_KEY=your_key` (from https://aistudio.google.com/apikey; billing must be on for
  images and video). Please don't paste the key here. Tell me when it's saved." In a cloud
  session the key is a network secret instead: point them to the "Gemini API key" section of
  `$MV/README.md`. Plan the rest of the film meanwhile.
- **3D wanted but Blender isn't ready here** (cloud session, or not installed): say in one line
  which shots will be made another way (three.js in code, or generated stills and clips) and go
  on, unless they'd rather run it on the PC with Blender.
- **Budget is $0**: no paid generation. Use code, Blender, synthesized sound, and their own material.
- **Their material**: "Drop the files here or tell me the folder." Copy them into
  `films/<slug>/assets/user/`; never move or change the originals.
- **Real people or brands without material**: say they'll appear as symbolic figures or
  generic products, unless the person supplies photos they have the rights to.
- **"Just make something" / unattended**: pick every default, run without stopping at the gates,
  stay within the budget, and record each choice in the README under "Choices made unattended".
