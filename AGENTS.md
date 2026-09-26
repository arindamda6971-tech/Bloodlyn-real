# Project architecture rules

- Keep large Admin test catalogues in React Query memory rather than synchronous localStorage persistence, because serialization blocks mobile route transitions.
- Persist Partner test availability and preparation metadata with cart items, because specialized-day validation must survive navigation and signed-in cart restoration.