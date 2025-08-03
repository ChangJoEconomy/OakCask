const express = require('express');
const path = require('path');
require('dotenv').config();
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const dbConnect = require('./config/dbConnect');
const app = express();
const port = process.env.PORT || 3000;

// db 연결
dbConnect();

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// express-ejs-layouts 설정
app.use(expressLayouts);
app.set('layout', 'layout'); // layout.ejs 파일을 기본 레이아웃으로 설정

// Body parser 미들웨어 설정
app.use(express.urlencoded({ extended: true })); // 폼 데이터 파싱
app.use(express.json()); // JSON 데이터 파싱

// Cookie parser 미들웨어 설정
app.use(cookieParser());

// 정적 파일 미들웨어 설정
app.use(express.static(path.join(__dirname, 'public')));

// 라우트 설정
app.use("/", require("./routes/main"));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});