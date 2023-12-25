const config = {
  // 启动端口
  port: 7000,
  // 缓存数据库配置
  // sessionDB: {
  //   DATABASE: 'koa_demo',
  //   USERNAME: 'root',
  //   PASSWORD: '',
  //   PORT: '3306',
  //   HOST: 'localhost'
  // },

  // 数据库配置
  devlopmentDB: {
    host: '202.120.188.26',
    user: 'postgres',
    password: 'TJ.idvxlab',
    port: '5432',
    max: 20,
    idleTimeoutMillis: 300000
  }
}

module.exports = config
