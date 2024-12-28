import express, { Request, Response } from 'express'
import { z } from 'zod'
import { processRequest, processRequestBody } from './zod-middleware'

import {
  upsertBiogenic,
  upsertScope1,
  upsertScope2,
  upsertStatedTotalEmissions,
  upsertCompany,
  upsertScope3,
  upsertTurnover,
  upsertEmployees,
  createGoals,
  updateGoal,
  createInitiatives,
  updateInitiative,
  createEqualities,
  updateEquality,
  createIndustry,
  updateIndustry,
  upsertReportingPeriod,
  upsertEmissions,
  upsertEconomy,
  upsertScope1And2,
  deleteInitiative,
  deleteGoal,
  deleteEquality,
  updateReportingPeriodReportURL,
} from '../lib/prisma'
import {
  createMetadata,
  fakeAuth,
  reportingPeriod,
  ensureEmissionsExists,
  validateReportingPeriod,
  validateMetadata,
  ensureEconomyExists,
} from './middlewares'
import { prisma } from '../lib/prisma'
import { Company, Prisma } from '@prisma/client'
import { wikidataIdParamSchema, wikidataIdSchema } from './companySchemas'
import { GarboAPIError } from '../lib/garbo-api-error'

const router = express.Router()

router.use('/', fakeAuth(prisma))
router.use('/', express.json())

// TODO: maybe begin transaction here, and cancel in the POST handler if there was no meaningful change
router.use('/', validateMetadata(), createMetadata(prisma))

const upsertCompanyBodySchema = z.object({
  wikidataId: wikidataIdSchema,
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  internalComment: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const validateCompanyUpsert = () => processRequestBody(upsertCompanyBodySchema)

async function handleCompanyUpsert(req: Request, res: Response) {
  const { name, description, url, internalComment, wikidataId, tags } =
    upsertCompanyBodySchema.parse(req.body)

  let company: Company

  try {
    company = await upsertCompany({
      wikidataId,
      name,
      description,
      url,
      internalComment,
      tags,
    })
  } catch (error) {
    throw new GarboAPIError('Failed to upsert company', {
      original: error,
    })
  }

  res.json(company)
}

// NOTE: Ideally we could have the same handler for both create and update operations, and provide the wikidataId as an URL param
// However, the middlewares didn't run in the expected order so the quick workaround was to just have two endpoints doing the same thing.
// Feel free to debug and improve!
router.post('/', validateCompanyUpsert(), handleCompanyUpsert)
router.post('/:wikidataId', validateCompanyUpsert(), handleCompanyUpsert)

// NOTE: Important to register this middleware after handling the POST requests for a specific wikidataId to still allow creating new companies.
router.use(
  '/:wikidataId',
  processRequest({
    params: wikidataIdParamSchema,
  }),
  async (req, res, next) => {
    const { wikidataId } = req.params
    const company = await prisma.company.findFirst({ where: { wikidataId } })
    if (!company) {
      throw new GarboAPIError('Company not found', { statusCode: 404 })
    }
    res.locals.company = company

    next()
  }
)

const goalSchema = z.object({
  description: z.string(),
  year: z.string().optional(),
  target: z.number().optional(),
  baseYear: z.string().optional(),
})

router.post(
  '/:wikidataId/goals',
  processRequest({
    body: z.object({
      goals: z.array(goalSchema),
    }),
    params: wikidataIdParamSchema,
  }),
  async (req, res) => {
    const { goals } = req.body

    if (goals?.length) {
      const { wikidataId } = req.params
      const metadata = res.locals.metadata

      await createGoals(wikidataId, goals, metadata!)
    }
    res.json({ ok: true })
  }
)

router.patch(
  '/:wikidataId/goals/:id',
  processRequest({
    body: z.object({ goal: goalSchema }),
    params: z.object({ id: z.coerce.number() }),
  }),
  async (req, res) => {
    const { goal } = req.body
    const { id } = req.params
    const metadata = res.locals.metadata
    await updateGoal(id, goal, metadata!).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GarboAPIError('Goal not found', {
          statusCode: 404,
          original: error,
        })
      }
      throw error
    })
    res.json({ ok: true })
  }
)

router.delete(
  '/:wikidataId/goals/:id',
  processRequest({
    params: z.object({ id: z.coerce.number() }),
  }),
  async (req, res) => {
    const { id } = req.params
    await deleteGoal(id).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GarboAPIError('Goal not found', {
          statusCode: 404,
          original: error,
        })
      }
      throw error
    })
    res.json({ ok: true })
  }
)

const initiativeSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  year: z.string().optional(),
  scope: z.string().optional(),
})

router.post(
  '/:wikidataId/initiatives',
  processRequest({
    body: z.object({
      initiatives: z.array(initiativeSchema),
    }),
    params: wikidataIdParamSchema,
  }),
  async (req, res) => {
    const { initiatives } = req.body

    if (initiatives?.length) {
      const { wikidataId } = req.params
      const metadata = res.locals.metadata

      await createInitiatives(wikidataId, initiatives, metadata!)
    }
    res.json({ ok: true })
  }
)

router.patch(
  '/:wikidataId/initiatives/:id',
  processRequest({
    body: z.object({ initiative: initiativeSchema }),
    params: z.object({ id: z.coerce.number() }),
  }),
  async (req, res) => {
    const { initiative } = req.body
    const { id } = req.params
    const metadata = res.locals.metadata
    await updateInitiative(id, initiative, metadata!).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GarboAPIError('Initiative not found', {
          statusCode: 404,
          original: error,
        })
      }
      throw error
    })
    res.json({ ok: true })
  }
)

router.delete(
  '/:wikidataId/initiatives/:id',
  processRequest({
    params: z.object({ id: z.coerce.number() }),
  }),
  async (req, res) => {
    const { id } = req.params
    await deleteInitiative(id).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GarboAPIError('Initiative not found', {
          statusCode: 404,
          original: error,
        })
      }
      throw error
    })
    res.json({ ok: true })
  }
)

const equalitySchema = z.object({
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
  ).optional()
})

router.post(
  '/:wikidataId/equalities',
  processRequest({
    body: z.object({
      equalities: z.array(equalitySchema),
    }),
    params: wikidataIdParamSchema,
  }),
  async (req, res) => {
    const { equalities } = req.body

    if (equalities?.length) {
      const { wikidataId } = req.params
      const metadata = res.locals.metadata

      await createEqualities(wikidataId, equalities, metadata!)
    }
    res.json({ ok: true })
  }
)

router.patch(
  '/:wikidataId/equalities/:id',
  processRequest({
    body: z.object({ equality: equalitySchema }),
    params: z.object({ id: z.coerce.number() }),
  }),
  async (req, res) => {
    const { equality } = req.body
    const { id } = req.params
    const metadata = res.locals.metadata
    await updateEquality(id, equality, metadata!).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GarboAPIError('Equality not found', {
          statusCode: 404,
          original: error,
        })
      }
      throw error
    })
    res.json({ ok: true })
  }
)

router.delete(
  '/:wikidataId/equalities/:id',
  processRequest({
    params: z.object({ id: z.coerce.number() }),
  }),
  async (req, res) => {
    const { id } = req.params
    await deleteEquality(id).catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new GarboAPIError('Equality not found', {
          statusCode: 404,
          original: error,
        })
      }
      throw error
    })
    res.json({ ok: true })
  }
)

const industrySchema = z.object({
  industry: z.object({
    subIndustryCode: z.string(),
  }),
})

router.post(
  '/:wikidataId/industry',
  processRequest({ body: industrySchema, params: wikidataIdParamSchema }),
  async (req, res) => {
    const { industry } = req.body
    // NOTE: This extra check is only necessary because we don't get correct TS types from the zod middleware processRequest().
    // Ideally, we could update the generic types of the zod-middleware to return the exact inferred schema, instead of turning everything into optional fields.
    const subIndustryCode = industry?.subIndustryCode
    if (!subIndustryCode) {
      throw new GarboAPIError('Unable to update industry')
    }

    const { wikidataId } = req.params
    const metadata = res.locals.metadata

    const current = await prisma.industry.findFirst({
      where: { companyWikidataId: wikidataId },
    })

    if (current) {
      console.log('updating industry', subIndustryCode)
      await updateIndustry(wikidataId, { subIndustryCode }, metadata!).catch(
        (error) => {
          throw new GarboAPIError('Failed to update industry', {
            original: error,
            statusCode: 500,
          })
        }
      )
    } else {
      console.log('creating industry', subIndustryCode)
      await createIndustry(wikidataId, { subIndustryCode }, metadata!).catch(
        (error) => {
          throw new GarboAPIError('Failed to create industry', {
            original: error,
            statusCode: 500,
          })
        }
      )
    }

    res.json({ ok: true })
  }
)

const statedTotalEmissionsSchema = z
  .object({ total: z.number() })
  .optional()
  .nullable()
  .describe('Sending null means deleting the statedTotalEmissions')

export const emissionsSchema = z
  .object({
    scope1: z
      .object({
        total: z.number(),
      })
      .optional()
      .nullable()
      .describe('Sending null means deleting the scope'),
    scope2: z
      .object({
        mb: z
          .number({ description: 'Market-based scope 2 emissions' })
          .optional()
          .nullable()
          .describe('Sending null means deleting mb scope 2 emissions'),
        lb: z
          .number({ description: 'Location-based scope 2 emissions' })
          .optional()
          .nullable()
          .describe('Sending null means deleting lb scope 2 emissions'),
        unknown: z
          .number({ description: 'Unspecified Scope 2 emissions' })
          .optional()
          .nullable()
          .describe('Sending null means deleting unknown scope 2 emissions'),
      })
      .refine(
        ({ mb, lb, unknown }) =>
          mb !== undefined || lb !== undefined || unknown !== undefined,
        {
          message:
            'At least one property of `mb`, `lb` and `unknown` must be defined if scope2 is provided',
        }
      )
      .optional()
      .nullable()
      .describe('Sending null means deleting the scope'),
    scope3: z
      .object({
        categories: z
          .array(
            z.object({
              category: z.number().int().min(1).max(16),
              total: z.number().nullable(),
            })
          )
          .optional(),
        statedTotalEmissions: statedTotalEmissionsSchema,
      })
      .optional(),
    biogenic: z
      .object({ total: z.number() })
      .optional()
      .nullable()
      .describe('Sending null means deleting the biogenic'),
    statedTotalEmissions: statedTotalEmissionsSchema,
    scope1And2: z
      .object({ total: z.number() })
      .optional()
      .nullable()
      .describe('Sending null means deleting the scope'),
  })
  .optional()

const economySchema = z
  .object({
    turnover: z
      .object({
        value: z.number().optional(),
        currency: z.string().optional(),
      })
      .optional()
      .nullable()
      .describe('Sending null means deleting the turnover'),
    employees: z
      .object({
        value: z.number().optional(),
        unit: z.string().optional(),
      })
      .optional()
      .nullable()
      .describe('Sending null means deleting the employees data'),
  })
  .optional()

const postReportingPeriodsSchema = z.object({
  reportingPeriods: z.array(
    z
      .object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        reportURL: z.string().optional(),
        emissions: emissionsSchema,
        economy: economySchema,
      })
      .refine(
        ({ startDate, endDate }) => startDate.getTime() < endDate.getTime(),
        {
          message: 'startDate must be earlier than endDate',
        }
      )
  ),
})

router.post(
  '/:wikidataId/reporting-periods',
  processRequestBody(postReportingPeriodsSchema),
  async (req, res) => {
    const { reportingPeriods } = postReportingPeriodsSchema.parse(req.body)
    const metadata = res.locals.metadata!
    const company = res.locals.company

    try {
      await Promise.allSettled(
        reportingPeriods.map(
          async ({
            emissions = {},
            economy = {},
            startDate,
            endDate,
            reportURL,
          }) => {
            const year = endDate.getFullYear().toString()
            const reportingPeriod = await upsertReportingPeriod(
              company,
              metadata,
              {
                startDate,
                endDate,
                reportURL,
                year,
              }
            )

            const [dbEmissions, dbEconomy] = await Promise.all([
              upsertEmissions({
                emissionsId: reportingPeriod.emissionsId ?? 0,
                companyId: company.wikidataId,
                year,
              }),
              upsertEconomy({
                economyId: reportingPeriod.economyId ?? 0,
                companyId: company.wikidataId,
                year,
              }),
            ])

            const {
              scope1,
              scope2,
              scope3,
              statedTotalEmissions,
              biogenic,
              scope1And2,
            } = emissions
            const { turnover, employees } = economy

            // Normalise currency
            if (turnover?.currency) {
              turnover.currency = turnover.currency.trim().toUpperCase()
            }

            await Promise.allSettled([
              scope1 !== undefined &&
                upsertScope1(dbEmissions, scope1, metadata),
              scope2 !== undefined &&
                upsertScope2(dbEmissions, scope2, metadata),
              scope3 && upsertScope3(dbEmissions, scope3, metadata),
              statedTotalEmissions !== undefined &&
                upsertStatedTotalEmissions(
                  dbEmissions,
                  statedTotalEmissions,
                  metadata
                ),
              biogenic !== undefined &&
                upsertBiogenic(dbEmissions, biogenic, metadata),
              scope1And2 !== undefined &&
                upsertScope1And2(dbEmissions, scope1And2, metadata),
              turnover !== undefined &&
                upsertTurnover(dbEconomy, turnover, metadata),
              employees !== undefined &&
                upsertEmployees(dbEconomy, employees, metadata),
            ])
          }
        )
      )
    } catch (error) {
      throw new GarboAPIError('Failed to update reporting periods', {
        original: error,
        statusCode: 500,
      })
    }

    res.json({ ok: true })
  }
)

router.patch(
  '/:wikidataId/report-url',
  processRequest({
    params: z.object({
      wikidataId: z.string(),
    }),
    body: z.object({
      year: z.string(),
      reportURL: z.string().url(),
    }),
  }),
  async (req, res) => {
    const { reportURL, year } = req.body
    const company = res.locals.company!

    try {
      const updatedPeriod = await updateReportingPeriodReportURL(
        company,
        year,
        reportURL
      )

      res.json({
        ok: true,
        message: updatedPeriod
          ? 'Sucessfully updated reportUrl'
          : ' No reporting period found',
      })
    } catch (error) {
      throw new GarboAPIError('Failed to update reportUrl', {
        original: error,
        statusCode: 500,
      })
    }
  }
)

router.use(
  '/:wikidataId/:year',
  validateReportingPeriod(),
  reportingPeriod(prisma)
)

router.use('/:wikidataId/:year/emissions', ensureEmissionsExists(prisma))
router.use('/:wikidataId/:year/economy', ensureEconomyExists(prisma))

const postEmissionsBodySchema = z.object({
  emissions: emissionsSchema,
})

// POST /Q12345/2022-2023/emissions
router.post(
  '/:wikidataId/:year/emissions',
  processRequestBody(postEmissionsBodySchema),
  async (req, res) => {
    const { emissions = {} } = postEmissionsBodySchema.parse(req.body)
    const {
      scope1,
      scope2,
      scope3,
      scope1And2,
      statedTotalEmissions,
      biogenic,
    } = emissions

    const metadata = res.locals.metadata!
    const dbEmissions = res.locals.emissions!

    try {
      // Only update if the input contains relevant changes
      // NOTE: The types for partial inputs like scope1 and scope2 say the objects always exist. However, this is not true.
      // There seems to be a type error in zod which doesn't take into account optional objects.

      await Promise.allSettled([
        scope1 !== undefined && upsertScope1(dbEmissions, scope1, metadata),
        scope2 !== undefined && upsertScope2(dbEmissions, scope2, metadata),
        scope3 && upsertScope3(dbEmissions, scope3, metadata),
        scope1And2 !== undefined &&
          upsertScope1And2(dbEmissions, scope1And2, metadata),
        statedTotalEmissions !== undefined &&
          upsertStatedTotalEmissions(
            dbEmissions,
            statedTotalEmissions,
            metadata
          ),
        biogenic !== undefined &&
          upsertBiogenic(dbEmissions, biogenic, metadata),
      ])
    } catch (error) {
      throw new GarboAPIError('Failed to update emissions', {
        original: error,
        statusCode: 500,
      })
    }

    res.json({ ok: true })
  }
)

const postEconomyBodySchema = z.object({
  economy: economySchema,
})

router.post(
  '/:wikidataId/:year/economy',
  processRequestBody(postEconomyBodySchema),
  async (req, res) => {
    const parsedBody = postEconomyBodySchema.parse(req.body)
    const { turnover, employees } = parsedBody.economy ?? {}

    const metadata = res.locals.metadata!
    const economy = res.locals.economy!

    // Normalise currency
    if (turnover) {
      turnover.currency = turnover?.currency?.trim()?.toUpperCase()
    }

    try {
      // Only update if the input contains relevant changes
      await Promise.allSettled([
        turnover !== undefined && upsertTurnover(economy, turnover, metadata),
        employees !== undefined &&
          upsertEmployees(economy, employees, metadata),
      ])
    } catch (error) {
      throw new GarboAPIError('Failed to update economy', {
        original: error,
        statusCode: 500,
      })
    }

    res.json({ ok: true })
  }
)

export default router
