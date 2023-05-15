import { Config } from '../src/modules/Config'

describe('Config', () => {
    let config: Config = Config.getInstance()

    beforeEach(() => {
      Config.getInstance().resetInstance()
      config = Config.getInstance()
    })

    test('should run', async () => {
        expect(true).toBe(true)
    })
})