// Import thư viện Express
const express = require('express');
const app = express();

// Middleware để đọc dữ liệu JSON từ body
app.use(express.json());

app.post('/api/post', 
    (req, res) => {  
        //parameters
        param = req.query.id;
        //body
        body = req.body;
        // get all header
        headers = req.headers;
        // Get a specific header (e.g., 'idHeader')
        idHeader = req.headers['idheader'];
         // Or log all 
        console.log("all data and Log: ", param, body, headers, idHeader);
        
        res.json({ 
        "message": "This is a POST request test!",
        "param": param,
        "body": body,
        "idHeader": idHeader,
        "headers": headers,
        
    
    });
});
// Khởi động server
app.listen(3000, () => {
  console.log('Server chạy tại http://localhost:3000');
});
