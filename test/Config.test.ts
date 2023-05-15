import Config from '../src/modules/Config'

describe('Config', () => {
    let config = Config

    beforeEach(() => {
      Config.resetInstance()
      config = Config
    })

    test('should run', async () => {
        expect(true).toBe(true)
    })
})