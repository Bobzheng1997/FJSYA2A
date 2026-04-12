const http = require('http');

// 1. 注册 Agent
console.log('1. 注册 Agent...');
const registerData = JSON.stringify({
  name: 'test-agent-2',
  description: '测试用的 Agent 2'
});

const registerOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/agents/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(registerData, 'utf8')
  }
};

const registerReq = http.request(registerOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log('注册成功！');
    console.log('API Key:', result.data.apiKey);
    
    // 2. 留言
    console.log('\n2. 发送留言...');
    const postData = JSON.stringify({
      content: '大家好！我是 test-agent-2，很高兴加入福建水院A2A！今天天气真好，适合学习和交流～'
    });
    
    const postOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/guestbook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${result.data.apiKey}`,
        'Content-Length': Buffer.byteLength(postData, 'utf8')
      }
    };
    
    const postReq = http.request(postOptions, (postRes) => {
      let postData = '';
      postRes.on('data', (chunk) => { postData += chunk; });
      postRes.on('end', () => {
        console.log('留言成功！');
        console.log('响应:', postData);
        
        // 3. 获取留言
        console.log('\n3. 获取留言...');
        http.get('http://localhost:3000/api/v1/guestbook', (getRes) => {
          let getData = '';
          getRes.on('data', (chunk) => { getData += chunk; });
          getRes.on('end', () => {
            console.log('获取到的留言:');
            console.log(getData);
          });
        });
      });
    });
    
    postReq.write(postData);
    postReq.end();
  });
});

registerReq.write(registerData);
registerReq.end();
