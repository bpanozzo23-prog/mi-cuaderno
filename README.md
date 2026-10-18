# Mi cuaderno

A personal Spanish notebook built around a bundled offline dictionary — a phone-first,
installable web app (PWA). Private tool for one person; the code is public, the data never is.

**[Open the app](https://bpanozzo23-prog.github.io/mi-cuaderno/)** — installable from Chrome on Android.

## Status

See [current state](docs/CURRENT.md) for the verified release, active work and pending checks.
The [documentation index](docs/README.md) separates guidance, proposals and historical records.
Agents start with the [shared guide](docs/AGENT-GUIDE.md).

## Development and checks

Use npm and the Node major selected in [.nvmrc](.nvmrc), with an installed version inside
`engines.node` in [package.json](package.json). [CI](.github/workflows/deploy.yml) reads the same
version file. The major selection allows patch/minor updates; it does not pin an exact release.
The engines field declares compatibility, without switching Node or enabling strict enforcement.
See [Linux](docs/agents/XPS.md#node-setup) or [Windows](docs/agents/WINDOWS.md#node-setup) for setup
and version checks, then run:

```sh
npm ci          # install locked dependencies
npm run dev     # http://localhost:5173/mi-cuaderno/
npm run lint    # JavaScript and React Hooks checks; zero warnings
npm test        # complete serial Vitest suite
npm run build   # production output in dist/
```

Database tests use real Dexie code with in-memory IndexedDB. Component tests opt into jsdom;
the pipeline has tests too. Shell-specific commands and verification rules are linked from
the [agent guide](docs/AGENT-GUIDE.md).

Pushes to `main` run lint and tests, build and deploy to GitHub Pages unless all changed paths
match the documentation exclusions in the [workflow](.github/workflows/deploy.yml). Mixed pushes
retain the full gate; manual runs remain available. Pushing requires an explicit request;
the [agent guide](docs/AGENT-GUIDE.md#environment-and-checks) covers publication records and
GitHub's path-filter limits.

## Data and project records

Personal notebook data lives on-device and is never committed. Reference data comes from open
sources: [attribution](DATA_SOURCES.md) and the [shipped manifest](public/dict/manifest.json)
record licenses, dataset revision, counts and package sizes.

[PRODUCT](docs/PRODUCT.md) and [ARCHITECTURE](docs/ARCHITECTURE.md) are the current contract.
The [brief](docs/mi-cuaderno-project-brief-v3.md) is preserved unchanged as history.
[Decisions](DECISIONS.md) retain the reasoning; [improvement ideas](docs/IMPROVEMENT-IDEAS.md)
and [guided lessons](docs/guided-lessons/README.md) distinguish proposals from approved work.
