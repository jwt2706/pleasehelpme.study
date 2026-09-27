# pleasehelpme.study

You know what they say, teaching is the best way to learn.

pleasehelpme.study is a fun little ai buddy that will listen to you explain concepts you are currently studying. It will then ask you questions on parts you may have glossed over, or not explained correctly. It pushes back, and if you fumble the follow-up question, that's exactly the part you need to study more!

It'll generate a beautiful little report on your knowledge gaps to help you know what you need to work on.

feynman technique, but it bullies you a little :)

live at [pleasehelpme.study](https://pleasehelpme.study)

## how it works

1. pick a topic
2. pick who's grilling you (light / working / deep comprehension)
3. explain it, answer the follow-ups (voice input + narrated replies supported)
4. get a gap report + flashcards for the stuff that thinned out
5. optionally link a parent/teacher account so they can see your reports too

## stack

- `frontend/` — react + vite, auth0, deployed on vercel/netlify
- `backend/` — node/express, gemini for the persona brains, sqlite for streaks + links, optional elevenlabs narration, deployed on vultr

built at hack the hill III, held together with hope 🙏
