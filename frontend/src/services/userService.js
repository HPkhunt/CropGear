import client from './api.js'

export const userService = {
  async me() {
    const { data } = await client.get('/users/me')
    return data
  }
}
