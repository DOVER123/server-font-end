/*
 * @Author: Dongge
 * @Date: 2019-05-16 10:35:38
 * @LastEditTime: 2019-05-24 09:56:04
 * @Description: server for front-end,mock--getfpdjson V1.0
 */

// 经过和node-oracle 模块作者的讨论，合理配置了连接池参数，poolMax:连接池最大保持连接数，需要小于128，poolMin:连接池最小存活连接，poolPingInterval:探活时间，poolTimeout：连接被销毁时间，0为永远不销毁，针对个人开发测试，推荐永远不销毁。--20190520
// 同步和异步ajax测试均通过，增加数据库信息配置文件datasource.ini,增加读取配置文件功能 --20150523
// 编写批处理启动server.cmd，整合运行环境:nodejs包，oracle客户端包instantclient_11_2，发布版V1.0 --20150524
var http = require('http');
var oracledb = require("oracledb");
var fs = require("fs");
var readline = require("readline");

var path = require('path')
var querystring = require('querystring')

oracledb.poolMax = 100;
oracledb.poolMin = 1;
oracledb.poolPingInterval = 20;
oracledb.poolTimeout = 0;

process
  .once('SIGTERM', closePoolAndExit)
  .once('SIGINT', closePoolAndExit);

// readFile 读取文件函数，返回promise
var readFile = async function (path) {
  var rl = readline.createInterface({
    input: fs.createReadStream(path).setEncoding('utf8')
  });
  return new Promise((resolve, reject) => {
    var array = [];
    rl.on("line", line => {
      array.push(line);
    });
    rl.on("close", () => {
      resolve(array);
    });
  });
};

// queryDB 执行sql操作，返回promise  
var queryDB = function (connection, sql) {
  return new Promise((resolve, reject) => {
    connection.execute(sql, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};
// 初始化连接池
var pool = {};

var initPool = async function () {
  var dbconfig = await readFile('./datasource.ini');
  for (var i = 0; i < dbconfig.length; i++) {
    var temp = dbconfig[i].split(',');
    try {
      await oracledb.createPool({
        _enableStats: true,
        user: temp[0],
        password: temp[1],  // mypw contains the hr schema password
        connectString: temp[2],
        poolAlias: temp[3]
      });
      pool[temp[3]] = true;
    } catch (err) {
      pool[temp[3]] = false;
      console.error(err.message);
      throw new Error('连接池'+temp[3]+"创建失败！")
    }
  }
}
async function closePoolAndExit() {
  console.log("\nTerminating");
  try {
    for(var key in pool){
      await oracledb.getPool(key).close(10);
    }
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
var executeSql = async function (dataSource, sql) {
  var pool_flag = pool[dataSource];
  if (!pool_flag) {
    return 
  }

  var pool_name = oracledb.getPool(dataSource);
  try {
    var connection = await pool_name.getConnection();
    let result = await connection.execute(sql);
    await connection.close();
    return Promise.resolve(result);
  } catch (err) {
    console.log(err.message)
  }

};
(async () => {
  await initPool();

  var server = http.createServer((req, res) => {
      if (req.url === "/getResult") {
          // 跨域，null是开启本地直接访问服务器特权
          res.setHeader('Access-Control-Allow-Origin', 'null');

          var params = '';
          req.setEncoding('utf8');
          // 采用post请求，接收前端的参数，这里考虑到sql里面可能有汉字，所以前端传过来的是编码后的JSON字符串。
          req.on('data', function (chunk) {
              params += chunk;
          });
          req.on('end', () => {
              params = decodeURIComponent(unescape(params));
              var { sql, dataSource } = JSON.parse(params);
              (async () => {
                  try {
                      var { metaData, rows } = await executeSql(dataSource, sql);
                      var data = [];
                      for (var i = 0; i < rows.length; i++) {
                          var temp = {}
                          for (var j = 0; j < metaData.length; j++) {
                              temp[metaData[j]['name']] = rows[i][j];
                          }
                          data.push(temp);
                      }
                      var dataReturn = { flag: 1, data: data }
                      res.end(JSON.stringify(dataReturn));
                  } catch (err) {
                      res.end(JSON.stringify({ flag: 0, data: err.message }));
                  }
              })();
          })

      } else if (req.url === "/getlog") {
          oracledb.getPool('J1_SGS')._logStats();
          res.end();
      }
  })
  await server.listen(8124)
})();
console.log('启动成功：监听端口8124')