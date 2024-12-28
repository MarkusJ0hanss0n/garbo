import { DiscordJob, DiscordWorker } from '../lib/DiscordWorker'
import { defaultMetadata, diffChanges } from '../lib/saveUtils'
import saveToAPI from './saveToAPI'

export class DiffEqualitiesJob extends DiscordJob {
  declare data: DiscordJob['data'] & {
    companyName: string
    existingCompany: any
    wikidata: { node: string }
    equalities: any
  }
}

const diffEqualities = new DiscordWorker<DiffEqualitiesJob>('diffEqualities', async (job) => {
  const { url, companyName, existingCompany, equalities } = job.data
  const metadata = defaultMetadata(url)

  const body = {
    equalities,
    metadata,
  }

  const { diff, requiresApproval } = await diffChanges({
    existingCompany,
    before: existingCompany?.goals,
    after: equalities,
  })

  job.log('Diff:' + diff)

  // Only save if we detected any meaningful changes
  if (diff) {
    await saveToAPI.queue.add(companyName + ' equalities', {
      ...job.data,
      body,
      diff,
      requiresApproval,
      apiSubEndpoint: 'equalities',

      // Remove duplicated job data that should be part of the body from now on
      equalities: undefined,
    })
  }

  return { body, diff, requiresApproval }
})

export default diffEqualities
