# NovaSpine + OpenClaw in Claw3D

Claw3D can attach NovaSpine to an existing local OpenClaw install without asking the user to install NovaSpine separately first.

## Intended User Flow

1. The user installs Claw3D.
2. The user already has OpenClaw on the machine.
3. Claw3D detects that OpenClaw install during onboarding or from the gateway settings panel.
4. The user clicks `Enable NovaSpine`.
5. Claw3D installs and validates the NovaSpine integration against that OpenClaw config.

From the user's point of view, they installed Claw3D and got NovaSpine memory in the same flow.

## Requirements

- OpenClaw already installed locally
- a reachable local OpenClaw config, typically `~/.openclaw/openclaw.json`
- Python 3.12+
- Git
- network access so Claw3D can fetch the NovaSpine repo cache and Python package

## What Claw3D Installs

Claw3D does not bundle a second runtime. It upgrades the user's existing OpenClaw setup by:

- fetching a NovaSpine source cache
- installing the NovaSpine Python package
- running the NovaSpine OpenClaw installer
- forcing the OpenClaw config onto NovaSpine's memory and context slots
- validating the final config

## What This Enables

Once the integration is active, the user's existing OpenClaw setup can benefit from:

- NovaSpine memory recall
- NovaSpine context injection
- NovaSpine-backed consciousness surfaces
- dream/wiki/facts features exposed through the NovaSpine path

Claw3D itself stays the UI/control layer. OpenClaw remains the runtime. NovaSpine becomes the memory/context layer attached to that runtime.

## What Stays the Same

- the user's OpenClaw install
- the user's model/provider configuration
- the gateway URL/token connection flow inside Claw3D
- the existing bootstrap files such as `SOUL.md`, `IDENTITY.md`, and `MEMORY.md`

## Scope

This first-pass integration is intentionally backend-first:

- it enables NovaSpine in the runtime
- it reports setup state in Claw3D
- it does not yet add dedicated recall/wiki dashboards inside the UI

Those richer UI surfaces can be added later without changing the integration shape.
