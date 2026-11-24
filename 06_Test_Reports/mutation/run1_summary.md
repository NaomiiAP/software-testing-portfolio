# Mutation testing - run #1 (before closing test gaps)

StrykerJS 10.1.1, vitest runner, `app/src/lib/**` (constants excluded), 932 mutants.
Raw console summary of the first run, kept for comparison with the final report
(`mutation-report.html` in this folder is always the latest run).

```
File            |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
All files       |  90.45 |   90.65 |      838 |         5 |         87 |        2 |        0 |
 auth.ts        |  97.44 |   97.44 |       38 |         0 |          1 |        0 |        0 |
 dates.ts       |  91.46 |   91.46 |       75 |         0 |          7 |        0 |        0 |
 fare.ts        |  94.12 |   94.12 |       94 |         2 |          6 |        0 |        0 |
 pnr.ts         |  94.44 |   94.44 |       17 |         0 |          1 |        0 |        0 |
 refund.ts      |  85.71 |   85.71 |       54 |         0 |          9 |        0 |        0 |
 reservation.ts |  87.35 |   87.87 |      295 |         2 |         41 |        2 |        0 |
 ticketState.ts |  89.29 |   89.29 |       25 |         0 |          3 |        0 |        0 |
 validation.ts  |  92.69 |   92.69 |      240 |         1 |         19 |        0 |        0 |
```

What the survivors revealed and what was done is described in
`06_Test_Reports/Test_Summary_Report.md` (section 6) and implemented in
`05_Test_Automation/unit-tests/mutationGaps.test.ts`.
