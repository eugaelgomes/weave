const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:8080/api/v1/ai/chat', {
      message: "cria uma task para mim com de teste. com todas as funcionalidades possíveis",
      model: { name: "openai:gpt-5.4" }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      responseType: 'stream'
    });
    
    res.data.on('data', chunk => console.log(chunk.toString()));
    res.data.on('end', () => console.log('Done'));
  } catch (err) {
    console.error(err.message);
  }
}
test();
