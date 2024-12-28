import { z } from 'zod'

export const schema = z.object({
  equality: z.array(
    z.object({
      initiatives: z.array(
        z.object({
          description: z.string(),
          year: z.number().optional(),
          target: z.string().optional(),
          baseYear: z.number().optional(),
        })
      ).optional(),
      goals: z.array(
        z.object({
          description: z.string(),
          year: z.number().optional(),
          target: z.string().optional(),
          baseYear: z.number().optional(),
        })
      ).optional(),
    })
  ),
})

export const prompt = `
Extract the company diversity and gender equality initiatives and future goals for all the years you can find.

If the number of initiatives is long, only include max three most important ones.

If no year is mentioned, set year to null. If you can't find any information about gender equality, report it as an empty array.

** LANGUAGE: WRITE IN SWEDISH. If text is in English, translate to Swedish **

Example: Ensure the output is in JSON format and do not use markdown.
\`\`\`json
{
  "equality: [
    "initiatives": [
      {
        "description": "Mentorskapsprogram för kvinnor och icke-binära",
        "year": null,
        "target": null,
        "baseYear": null
      }
    ],
    "goals": [
        "description": "Öka andel kvinnor i styrelse X%",
        "year": null,
        "target": null,
        "baseYear": null
    ],
  ]
}
\`\`\`
`

const queryTexts = [
  'Diversity goals',
  'Gender equality targets',
  'Inclusion initiatives',
]

export default { prompt, schema, queryTexts }
