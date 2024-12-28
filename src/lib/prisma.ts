import {
  PrismaClient,
  Metadata,
  Scope1,
  Scope2,
  Company,
  Emissions,
  BiogenicEmissions,
  StatedTotalEmissions,
  Scope3,
  Economy,
  Employees,
  Turnover,
  Goal,
  Initiative,
  Scope1And2,
  Equality,
} from '@prisma/client'
import { OptionalNullable } from './type-utils'

export const prisma = new PrismaClient()

const tCO2e = 'tCO2e'

export async function upsertScope1(
  emissions: Emissions,
  scope1: OptionalNullable<Omit<Scope1, 'id' | 'metadataId' | 'unit'>> | null,
  metadata: Metadata
) {
  if (scope1 === null) {
    if (emissions.scope1Id) {
      await prisma.scope1.delete({
        where: { id: emissions.scope1Id },
      })
    }
    return null
  }

  return emissions.scope1Id
    ? prisma.scope1.update({
        where: { id: emissions.scope1Id },
        data: {
          ...scope1,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    : prisma.scope1.create({
        data: {
          ...scope1,
          unit: tCO2e,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
          emissions: {
            connect: {
              id: emissions.id,
            },
          },
        },
        select: { id: true },
      })
}

export async function upsertScope2(
  emissions: Emissions,
  scope2: {
    lb?: number | null
    mb?: number | null
    unknown?: number | null
  } | null,
  metadata: Metadata
) {
  if (scope2 === null) {
    if (emissions.scope2Id) {
      await prisma.scope2.delete({
        where: { id: emissions.scope2Id },
      })
    }
    return null
  }

  return emissions.scope2Id
    ? prisma.scope2.update({
        where: { id: emissions.scope2Id },
        data: {
          ...scope2,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    : prisma.scope2.create({
        data: {
          ...scope2,
          unit: tCO2e,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
          emissions: {
            connect: {
              id: emissions.id,
            },
          },
        },
        select: { id: true },
      })
}

export async function upsertScope1And2(
  emissions: Emissions,
  scope1And2: OptionalNullable<
    Omit<Scope1And2, 'id' | 'metadataId' | 'unit'>
  > | null,
  metadata: Metadata
) {
  if (scope1And2 === null) {
    if (emissions.scope1And2Id) {
      await prisma.scope1And2.delete({
        where: { id: emissions.scope1And2Id },
      })
    }
    return null
  }

  return emissions.scope1And2Id
    ? prisma.scope1And2.update({
        where: { id: emissions.scope1And2Id },
        data: {
          ...scope1And2,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    : prisma.scope1And2.create({
        data: {
          ...scope1And2,
          unit: tCO2e,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
          emissions: {
            connect: {
              id: emissions.id,
            },
          },
        },
        select: { id: true },
      })
}

export async function upsertScope3(
  emissions: Emissions,
  scope3: {
    categories?: { category: number; total: number | null }[]
    statedTotalEmissions?: OptionalNullable<
      Omit<StatedTotalEmissions, 'id' | 'metadataId' | 'unit' | 'scope3Id'>
    > | null
  },
  metadata: Metadata
) {
  const updatedScope3 = await prisma.scope3.upsert({
    where: { id: emissions.scope3Id ?? 0 },
    update: {},
    create: {
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
      emissions: {
        connect: {
          id: emissions.id,
        },
      },
    },
    include: {
      statedTotalEmissions: { select: { id: true } },
      categories: {
        select: {
          id: true,
          category: true,
        },
      },
    },
  })

  await prisma.scope3Category.deleteMany({
    where: {
      scope3Id: updatedScope3.id,
      category: {
        in: (scope3.categories ?? [])
          .filter((c) => c.total === null)
          .map((c) => c.category),
      },
    },
  })

  // Upsert only the scope 3 categories from the request body
  await Promise.all(
    (scope3.categories ?? []).map((scope3Category) => {
      const matching = updatedScope3.categories.find(
        ({ category }) => scope3Category.category === category
      )

      if (scope3Category.total === null) {
        return null
      }

      return prisma.scope3Category.upsert({
        where: {
          id: matching?.id ?? 0,
        },
        update: {
          ...scope3Category,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        create: {
          ...scope3Category,
          unit: tCO2e,
          scope3: {
            connect: {
              id: updatedScope3.id,
            },
          },
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    })
  )

  if (scope3.statedTotalEmissions !== undefined) {
    await upsertStatedTotalEmissions(
      emissions,
      scope3.statedTotalEmissions,
      metadata,
      updatedScope3
    )
  }
}

export async function upsertBiogenic(
  emissions: Emissions,
  biogenic: OptionalNullable<
    Omit<BiogenicEmissions, 'id' | 'metadataId' | 'unit'>
  > | null,
  metadata: Metadata
) {
  if (biogenic === null) {
    if (emissions.biogenicEmissionsId) {
      await prisma.biogenicEmissions.delete({
        where: { id: emissions.biogenicEmissionsId },
      })
    }
    return null
  }

  return emissions.biogenicEmissionsId
    ? prisma.biogenicEmissions.update({
        where: {
          id: emissions.biogenicEmissionsId,
        },
        data: {
          ...biogenic,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    : prisma.biogenicEmissions.create({
        data: {
          ...biogenic,
          unit: tCO2e,
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
          emissions: {
            connect: {
              id: emissions.id,
            },
          },
        },
        select: { id: true },
      })
}

export async function upsertStatedTotalEmissions(
  emissions: Emissions,
  statedTotalEmissions: OptionalNullable<
    Omit<StatedTotalEmissions, 'id' | 'metadataId' | 'unit' | 'scope3Id'>
  > | null,
  metadata: Metadata,
  scope3?: Scope3 & { statedTotalEmissions: { id: number } | null }
) {
  const statedTotalEmissionsId = scope3
    ? scope3.statedTotalEmissionsId || scope3?.statedTotalEmissions?.id
    : emissions.statedTotalEmissionsId

  if (statedTotalEmissions === null) {
    if (statedTotalEmissionsId) {
      await prisma.statedTotalEmissions.delete({
        where: {
          id: statedTotalEmissionsId,
        },
      })
    }
    return null
  }

  return prisma.statedTotalEmissions.upsert({
    where: { id: statedTotalEmissionsId ?? 0 },
    create: {
      ...statedTotalEmissions,
      unit: tCO2e,
      emissions: scope3
        ? undefined
        : {
            connect: { id: emissions.id },
          },
      scope3: scope3
        ? {
            connect: { id: scope3.id },
          }
        : undefined,
      metadata: {
        connect: { id: metadata.id },
      },
    },
    update: {
      ...statedTotalEmissions,
      metadata: {
        connect: { id: metadata.id },
      },
    },
    select: { id: true },
  })
}

export async function upsertCompany({
  wikidataId,
  ...data
}: {
  wikidataId: string
  name: string
  description?: string
  url?: string
  internalComment?: string
  tags?: string[]
}) {
  return prisma.company.upsert({
    where: {
      wikidataId,
    },
    create: {
      ...data,
      wikidataId,
    },
    // TODO: Should we allow updating the wikidataId?
    // Probably yes from a business perspective, but that also means we need to update all related records too.
    // Updating the primary key can be tricky, especially with backups using the old primary key no longer being compatible.
    // This might be a reason why we shouldn't use wikidataId as our primary key in the DB.
    // However, no matter what, we could still use wikidataId in the API and in the URL structure.
    update: { ...data },
  })
}

export async function createGoals(
  wikidataId: Company['wikidataId'],
  goals: OptionalNullable<
    Omit<Goal, 'metadataId' | 'reportingPeriodId' | 'companyId' | 'id'>
  >[],
  metadata: Metadata
) {
  return prisma.$transaction(
    goals.map((goal) =>
      prisma.goal.create({
        data: {
          ...goal,
          description: goal.description,
          company: {
            connect: {
              wikidataId,
            },
          },
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    )
  )
}

export async function updateGoal(
  id: Goal['id'],
  goal: OptionalNullable<
    Omit<Goal, 'metadataId' | 'reportingPeriodId' | 'companyId' | 'id'>
  >,
  metadata: Metadata
) {
  return prisma.goal.update({
    where: { id },
    data: {
      ...goal,
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
    },
    select: { id: true },
  })
}

export async function deleteGoal(id: Goal['id']) {
  return prisma.goal.delete({ where: { id } })
}

export async function createInitiatives(
  wikidataId: Company['wikidataId'],
  initiatives: OptionalNullable<
    Omit<Initiative, 'metadataId' | 'companyId' | 'id'>
  >[],
  metadata: Metadata
) {
  return prisma.$transaction(
    initiatives.map((initiative) =>
      prisma.initiative.create({
        data: {
          ...initiative,
          title: initiative.title,
          company: {
            connect: {
              wikidataId,
            },
          },
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    )
  )
}

export async function updateInitiative(
  id: Initiative['id'],
  initiative: OptionalNullable<
    Omit<Initiative, 'metadataId' | 'companyId' | 'id'>
  >,
  metadata: Metadata
) {
  return prisma.initiative.update({
    where: { id },
    data: {
      ...initiative,
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
    },
    select: { id: true },
  })
}

export async function deleteInitiative(id: Initiative['id']) {
  return prisma.initiative.delete({ where: { id } })
}

export async function createEqualities(
  wikidataId: Company['wikidataId'],
  equialities: OptionalNullable<
    Omit<Equality, 'metadataId' | 'reportingPeriodId' | 'companyId' | 'id'>
  >[],
  metadata: Metadata
) {
  return prisma.$transaction(
    equialities.map((equality) =>
      prisma.equality.create({
        data: {
          ...equality,
          description: equality.description,
          company: {
            connect: {
              wikidataId,
            },
          },
          metadata: {
            connect: {
              id: metadata.id,
            },
          },
        },
        select: { id: true },
      })
    )
  )
}

export async function updateEquality(
  id: Equality['id'],
  equality: OptionalNullable<
    Omit<Equality, 'metadataId' | 'reportingPeriodId' | 'companyId' | 'id'>
  >,
  metadata: Metadata
) {
  return prisma.equality.update({
    where: { id },
    data: {
      ...equality,
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
    },
    select: { id: true },
  })
}

export async function deleteEquality(id: Equality['id']) {
  return prisma.equality.delete({ where: { id } })
}

export async function upsertTurnover(
  economy: Economy,
  turnover: OptionalNullable<
    Omit<Turnover, 'id' | 'metadataId' | 'unit'>
  > | null,
  metadata: Metadata
) {
  if (turnover === null) {
    if (economy.turnoverId) {
      await prisma.turnover.delete({
        where: { id: economy.turnoverId },
      })
    }
    return null
  }

  return prisma.turnover.upsert({
    where: { id: economy.turnoverId ?? 0 },
    create: {
      ...turnover,
      metadata: {
        connect: { id: metadata.id },
      },
      economy: {
        connect: { id: economy.id },
      },
    },
    update: {
      ...turnover,
      metadata: {
        connect: { id: metadata.id },
      },
    },
    select: { id: true },
  })
}

export async function upsertEmployees(
  economy: Economy,
  employees: OptionalNullable<Omit<Employees, 'id' | 'metadataId'>> | null,
  metadata: Metadata
) {
  if (employees === null) {
    if (economy.employeesId) {
      await prisma.employees.delete({
        where: { id: economy.employeesId },
      })
    }
    return null
  }

  return prisma.employees.upsert({
    where: { id: economy.employeesId ?? 0 },
    create: {
      ...employees,
      metadata: {
        connect: { id: metadata.id },
      },
      economy: {
        connect: { id: economy.id },
      },
    },
    update: {
      ...employees,
      metadata: {
        connect: { id: metadata.id },
      },
    },
    select: { id: true },
  })
}

export async function createIndustry(
  wikidataId: Company['wikidataId'],
  industry: { subIndustryCode: string },
  metadata: Metadata
) {
  return prisma.industry.create({
    data: {
      company: {
        connect: { wikidataId },
      },
      industryGics: {
        connect: {
          subIndustryCode: industry.subIndustryCode,
        },
      },
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
    },
    select: { id: true },
  })
}

export async function updateIndustry(
  wikidataId: Company['wikidataId'],
  industry: { subIndustryCode: string },
  metadata: Metadata
) {
  return prisma.industry.update({
    where: { companyWikidataId: wikidataId },
    data: {
      industryGics: {
        connect: {
          subIndustryCode: industry.subIndustryCode,
        },
      },
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
    },
    select: { id: true },
  })
}

export async function upsertReportingPeriod(
  company: Company,
  metadata: Parameters<typeof prisma.metadata.create>[0]['data'],
  {
    startDate,
    endDate,
    reportURL,
    year,
  }: { startDate: Date; endDate: Date; reportURL?: string; year: string }
) {
  return prisma.reportingPeriod.upsert({
    where: {
      reportingPeriodId: {
        companyId: company.wikidataId,
        year,
      },
      // NOTE: Maybe only check it's the same year of the endDate, instead of requiring the exact date to be provided in the request body.
      // We might want to allow just sending a GET request to for example /2023/emissions.
    },
    update: {},
    create: {
      startDate,
      endDate,
      reportURL,
      year,
      company: {
        connect: {
          wikidataId: company.wikidataId,
        },
      },
      metadata: {
        connect: {
          id: metadata.id,
        },
      },
    },
  })
}

export async function updateReportingPeriodReportURL(
  company: Company,
  year: string,
  reportURL: string
) {
  const reportingPeriod = await prisma.reportingPeriod.findUnique({
    where: {
      reportingPeriodId: {
        companyId: company.wikidataId,
        year,
      },
    },
  })

  if (!reportingPeriod) {
    return false
  }

  return prisma.reportingPeriod.update({
    where: {
      reportingPeriodId: {
        companyId: company.wikidataId,
        year,
      },
    },
    data: {
      reportURL,
    },
  })
}

export async function upsertEmissions({
  emissionsId,
  year,
  companyId,
}: {
  emissionsId: number
  year: string
  companyId: string
}) {
  return prisma.emissions.upsert({
    where: { id: emissionsId },
    update: {},
    create: {
      reportingPeriod: {
        connect: {
          reportingPeriodId: {
            year,
            companyId,
          },
        },
      },
    },
  })
}

export async function upsertEconomy({
  economyId,
  companyId,
  year,
}: {
  economyId: number
  companyId: string
  year: string
}) {
  return prisma.economy.upsert({
    where: { id: economyId },
    update: {},
    create: {
      reportingPeriod: {
        connect: {
          reportingPeriodId: {
            year,
            companyId,
          },
        },
      },
    },
  })
}
