# Waterbus SFU Server

<img src="./images/waterbus-banner-sfu-server.png" width="100%"/>

## Codec supported
| Codec | VP8 | VP9 | H264 | H265  ![Beta](https://img.shields.io/badge/beta-green) | AV1 |
| :-----: | :---------------: | :------------: | :------------: | :----------------: | :--------------------------------: |
|   iOS   |        🟢         |       🟢       |       🟢       |         🟢         |         🟢         |
| Android |        🟢         |       🟢       |       🟢       |         🟢         |         🟢         |


🟢 = Available

🟡 = Coming soon (Work in progress)

🔴 = Not currently available (Possibly in the future)

## 🚀 Getting Started

### 🔧 Installation

1. Clone this repository

```bash
git clone https://github.com/waterbustech/waterbus-sfu-meeting.git
```

2. Change to the project directory:
```sh
cd waterbus-sfu-meeting
```

3. Install the dependencies:

```bash
npm install
```

or 

```bash
yarn
```

4. Config .env

```bash
mv example.env .env
```

fill out your config in `.env`

### 🤖 Running waterbus

```bash
npm run start 
```