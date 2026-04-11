# API Keys and Your Privacy

This note explains, in simple terms, why Alpha Agent Builder asks for API keys and how they are handled.

## Why the app asks for API keys

Alpha Agent Builder can:

- generate agent logic using an LLM
- edit/fix an agent with AI help
- run agents that call OpenAI or Gemini
- check code into GitHub when you provide a `GITHUB_TOKEN`

To do that, the app needs permission to talk to those services on your behalf.

## What happens when you save a key

When you add keys such as:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `GITHUB_TOKEN`

they are saved on the **server side** for your account.

After you save them:

- the app does **not** show the full raw key back in the browser again
- the UI only shows a **masked** version so you can confirm which keys are present
- the keys are **not** copied into every generated agent folder as a permanent `.env` file

## When the keys are actually used

Your saved keys are only used when needed for a backend action, for example:

- generating a new agent
- using **Edit / fix agent**
- running an agent that needs an LLM provider
- checking code into GitHub using `GITHUB_TOKEN`

For normal use, the keys stay on the server and are passed into the running process only when required.

## What this means in plain English

In simple terms:

- your keys are **not baked into the website**
- your keys are **not sent back to the browser in full after saving**
- your keys are **not permanently scattered across each generated project**
- the app tries to give each action only the secret it actually needs

This reduces the chances of accidental exposure.

## What the app does not claim

No internet-connected system can honestly promise "zero risk."

What Alpha Agent Builder aims to do is:

- keep keys on the server side
- avoid showing raw keys back to the browser
- avoid copying them into many places
- use them only for the actions you request

That is a safer design than storing keys in visible browser state or writing them into every generated agent folder.

## Good practices for users

To reduce risk even further, we recommend:

1. Create a separate API key just for Alpha Agent Builder.
2. Use project-scoped or limited-scope keys when your provider supports that.
3. Rotate or revoke keys any time you no longer need them.
4. Use `GITHUB_TOKEN` only if you plan to use the GitHub check-in feature.

## Questions users often ask

### Can other users see my keys?

The app is designed to keep saved keys tied to **your own account** only.

### Can I confirm that a key is saved?

Yes. The app shows a **masked** version of the variable so you can verify that it exists without exposing the full secret.

### Are keys stored in the frontend?

No. They are intended to remain server-side after saving, and the frontend should only receive masked status information.

### Can I replace or clear a key later?

Yes. You can update a saved key, or clear it by saving that variable with an empty value.

## Short reassurance

If you save your API keys in Alpha Agent Builder, the app is designed so the keys remain on the server side, are not shown back to the browser in full, and are only used for the actions you ask it to perform.

That said, best practice is still to use dedicated keys, keep scopes limited where possible, and rotate them when needed.
