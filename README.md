
# stattrak

<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>
<!--
*** Thanks for checking out the Best-README-Template. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING! :D
-->



<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<!-- <br />
<div align="center">
  <a href="https://github.com/github_username/repo_name">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">project_title</h3>

  <p align="center">
    project_description
    <br />
    <a href="https://github.com/github_username/repo_name"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/github_username/repo_name">View Demo</a>
    ·
    <a href="https://github.com/github_username/repo_name/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/github_username/repo_name/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div> -->



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

<!--[![Product Name Screen Shot][product-screenshot]](https://example.com)

Here's a blank template to get started: To avoid retyping too much info. Do a search and replace with your text editor for the following: `github_username`, `repo_name`, `twitter_handle`, `linkedin_username`, `email_client`, `email`, `project_title`, `project_description`

<p align="right">(<a href="#readme-top">back to top</a>)</p> -->

Counter-Strike 2 gameplay aggregator and stat collector


### Built With

* [![TypeScript][TypeScript.js]][TypeScript-url]
* [![React][React.js]][React-url]
* [![Node.js][Node.js]][Node-url]
* [![Python][Python.js]][Python-url]
* [![PostgreSQL][PostgreSQL.js]][PostgreSQL-url]
* [![Steam][Steam.js]][Steam-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   stattrakClient│────▶│  stattrakServer │────▶│   PostgreSQL    │
│   (React App)   │     │  (Express API)  │     │    Database     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
        │                                                │
        │              ┌─────────────────┐               │
        │              │     demoETL     │               │
        │              │ (Python Pipeline)│◀─────────────┘
        │              └────────┬────────┘
        │                       │
        │                       ▼
        │              ┌─────────────────┐
        │              │   Steam Web API │
        │              │   & Demo Files  │
        └──────────────└─────────────────┘
```

## Project Structure

### stattrakClient (React Frontend)
Location: `./stattrakClient`

A React + TypeScript single-page application for viewing CS2 match statistics.

**Tech Stack:**
- React 18 with TypeScript
- Vite (build tool)
- React Router (client-side routing)

**Key Directories:**
```
stattrakClient/src/
├── components/     # Reusable UI components (Layout, Loading, StatCard, etc.)
├── pages/          # Page components (Home, Matches, Player, Weapons)
├── services/       # API client for backend communication
└── types/          # TypeScript interfaces for all data models
```

**Running the Frontend:**
```bash
cd stattrakClient
npm install
npm run dev        # Development server on http://localhost:5173
npm run build      # Production build
```

---

### stattrakServer (TypeScript API)
Location: `./stattrakServer`

A REST API server built with Express.js and TypeScript that serves match statistics from PostgreSQL.

**Tech Stack:**
- Express.js with TypeScript
- PostgreSQL (via `pg` driver)
- Helmet (security headers)
- CORS enabled

**Key Directories:**
```
stattrakServer/source/
├── config/         # Environment configuration (dotenv)
├── database/       # PostgreSQL connection pool
├── models/         # TypeScript interfaces (Player, Match, Round, Kill, Weapon)
├── services/       # Database query logic
├── controllers/    # Request handlers
├── routes/         # API endpoint definitions
├── middleware/     # Error handling
├── utils/          # Custom error classes
└── types/          # Enums and API response types
```

**API Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/players/:steamId` | Player profile & aggregate stats |
| `GET /api/players/:steamId/matches` | Player match history (paginated) |
| `GET /api/players/:steamId/weapons` | Player weapon breakdown |
| `GET /api/players/:steamId/maps` | Player performance by map |
| `GET /api/matches` | List all matches (paginated) |
| `GET /api/matches/:matchId` | Full match details with scoreboard |
| `GET /api/matches/:matchId/rounds` | Round-by-round breakdown |
| `GET /api/matches/:matchId/kills` | All kill events in match |
| `GET /api/weapons` | Global weapon statistics |
| `GET /api/weapons/:weaponName` | Stats for specific weapon |

**Running the Server:**
```bash
cd stattrakServer
npm install
cp .env.example .env   # Configure database credentials
npm run dev            # Development server on http://localhost:8080
npm run build          # Compile TypeScript
```

**Environment Variables (.env):**
```
PORT=8080
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stattrak
DB_USER=postgres
DB_PASSWORD=your_password
```

---

### demoETL (Python Pipeline)
Location: `./demoETL`

Python ETL pipeline that detects completed CS2 matches, downloads demo files, and parses them using demoparser2.

**Tech Stack:**
- Python 3
- SQLAlchemy + psycopg2 (PostgreSQL)
- steam & csgo libraries (Steam/CSGO client integration)
- demoparser2 (demo file parsing)
- pandas (data manipulation)

**Key Files:**
```
demoETL/
├── db_utils.py                  # Database connection class
├── match_completion_detection.py # Polls Steam API for new matches
├── retrieve_match.py            # Main ETL orchestration
└── demo.py                      # Demo download, decompress, parse
```

**Data Flow:**
1. `match_completion_detection.py` - Polls Steam Web API, queues new matches
2. `retrieve_match.py` - Dequeues matches, fetches demo URLs from Steam
3. `demo.py` - Downloads, decompresses, and parses demo files with demoparser2

**Data Sources:**
- CS2 Matchmaking (implemented)
- Faceit (planned)
- ESEA (planned)

**Database Schemas:**
- `matches.queue` - Matches pending processing
- `matches.processed` - Successfully processed matches
- `matches.queue_failed_to_process` - Failed processing attempts
- `users.latest_match_auth` - User authentication & latest match codes
- `stats.*` - Parsed match statistics (planned)

**Configuration:**
Requires `~/.ssh/db_user.json` with PostgreSQL credentials:
```json
{
  "database": "stattrak",
  "user": "your_user",
  "host": "localhost",
  "password": "your_password",
  "port": "5432"
}
```

Requires `~/.ssh/steam_user.json` with Steam credentials:
```json
{
  "username": "your_steam_username",
  "password": "your_steam_password"
}
```

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

- **Node.js** (v18+) and npm
- **Python** (3.9+) with pip
- **PostgreSQL** (14+)
- **Steam Account** with CS2 and valid match history

### Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/JackWagner/stattrak.git
   cd stattrak
   ```

2. **Set up PostgreSQL database**
   ```sql
   CREATE DATABASE stattrak;
   ```

3. **Install and run the API server**
   ```sh
   cd stattrakServer
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm run dev
   ```

4. **Install and run the React frontend**
   ```sh
   cd stattrakClient
   npm install
   npm run dev
   ```

5. **Set up the Python ETL** (optional, for processing new matches)
   ```sh
   cd demoETL
   pip install -r requirements.txt
   # Configure ~/.ssh/db_user.json and ~/.ssh/steam_user.json
   python retrieve_match.py
   ```

### Quick Start

Once everything is running:
- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:8080
- **API Health Check**: http://localhost:8080/health

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

<!--Use this space to show useful examples of how a project can be used. Additional screenshots, code examples and demos work well in this space. You may also link to more resources.

_For more examples, please refer to the [Documentation](https://example.com)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>

-->

<!-- ROADMAP -->
## Roadmap

- [x] TypeScript API server with Express
- [x] React frontend with match/player/weapon views
- [x] Python ETL for match detection and demo downloading
- [ ] Complete stats schema for parsed demo data
- [ ] ETL integration to store parsed stats in PostgreSQL
- [ ] Faceit match integration
- [ ] ESEA match integration
- [ ] User authentication
- [ ] Real-time match notifications

See the [open issues](https://github.com/JackWagner/stattrak/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

<!--
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/github_username/repo_name/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=github_username/repo_name" alt="contrib.rocks image" />
</a>
-->


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Jack Wagner - [LinkedIn](https://www.linkedin.com/in/jack-wagner-050186142/) - jack.wagner5299@gmail.com

Project Link: [https://github.com/JackWagner/stattrak](https://github.com/JackWagner/stattrak)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

<!--
* []()
* []()
* []()

<p align="right">(<a href="#readme-top">back to top</a>)</p>
-->


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/JackWagner/stattrak.svg?style=for-the-badge
[contributors-url]: https://github.com/JackWagner/stattrak/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/JackWagner/stattrak.svg?style=for-the-badge
[forks-url]: https://github.com/JackWagner/stattrak/network/members
[stars-shield]: https://img.shields.io/github/stars/JackWagner/stattrak.svg?style=for-the-badge
[stars-url]: https://github.com/JackWagner/stattrak/stargazers
[issues-shield]: https://img.shields.io/github/issues/JackWagner/stattrak.svg?style=for-the-badge
[issues-url]: https://github.com/JackWagner/stattrak/issues
[license-shield]: https://img.shields.io/github/license/JackWagner/stattrak.svg?style=for-the-badge
[license-url]: https://github.com/JackWagner/stattrak/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/jack-wagner-050186142/
[product-screenshot]: images/screenshot.png
[Python.js]: https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=fff
[Python-url]: https://www.python.org
[Go.js]: https://img.shields.io/badge/Go-%2300ADD8.svg?&logo=go&logoColor=white
[Go-url]: https://go.dev
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Steam.js]: https://img.shields.io/badge/Steam-%23000000.svg?logo=steam&logoColor=white
[Steam-url]: https://steamcommunity.com/dev
[TypeScript.js]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org/
[PostgreSQL.js]: https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
