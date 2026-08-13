# Service Coverage Contracts

The focused coverage command enforces at least 80% statements, branches,
functions, and lines for each service below.

| Service | Semantic contracts | Test file |
| --- | --- | --- |
| `api.ts` | nested API errors, status-text fallback, transport errors, native and unknown errors, request locale, response unwrapping, HTTP delegation, browser and server base URLs | `src/services/__tests__/api.test.ts` |
| `backupsService.ts` | manifest read and parse failures, missing directory, unreadable manifest skip, missing snapshot fallback, metadata derivation, pin detection, reverse timestamp order | `src/services/__tests__/backupsService.test.ts` |

Run the contract with:

```sh
npm test -- --coverage --run src/services/__tests__/api.test.ts src/services/__tests__/backupsService.test.ts
```
