
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

* [![Steam][Steam.js]][Steam-url]
* [![AWS][AWS.js]][AWS-url]
* [![Python][Python.js]][Python-url]
* [![React][React.js]][React-url]
* [![Go][Go.js]][Go-url]
<!--* [![Alpaca][Alpaca.js]][Alpaca-url]
* [![X][X.js]][X-url]
* [![Discord][Discord.js]][Discord-url]
* [![Reddit][Reddit.js]][Reddit-url] -->

<!-- <p align="right">(<a href="#readme-top">back to top</a>)</p> -->

### Sources

- ./stattrak
    - Front End using TypeScript React
- ./stattrakServer
    - Back End TypeScript API for parsing game files
        - express
	    - @laihoe/demoparser
	    - morgan
	    - typescript
- ./demoETL
    - Python ETL pipeline for moving demo files
        - Data sources:
            - CS2 MM
            - Faceit (TBD)
            - ESEA (TBD)
	- Asynchronous match completion detection & handling
	- PostgreSQL for storing match metadata

<!-- GETTING STARTED -->
## Getting Started

<!-- This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps. -->

### Prerequisites

<!--This is an example of how to list things you need to use the software and how to install them.
* npm
  ```sh
  npm install npm@latest -g
  ```
-->
### Installation
<!--
1. Get a free API Key at [https://example.com](https://example.com)
2. Clone the repo
   ```sh
   git clone https://github.com/github_username/repo_name.git
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Enter your API in `config.js`
   ```js
   const API_KEY = 'ENTER YOUR API';
   ```
5. Change git remote url to avoid accidental pushes to base project
   ```sh
   git remote set-url origin github_username/repo_name
   git remote -v # confirm the changes
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

-->

<!-- USAGE EXAMPLES -->
## Usage

<!--Use this space to show useful examples of how a project can be used. Additional screenshots, code examples and demos work well in this space. You may also link to more resources.

_For more examples, please refer to the [Documentation](https://example.com)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>

-->

<!-- ROADMAP -->
## Roadmap

<!--
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3
    - [ ] Nested Feature

See the [open issues](https://github.com/github_username/repo_name/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

-->

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
[AWS.js]: https://img.shields.io/badge/AWS-%23FF9900.svg?logo=amazon-web-services&logoColor=white
[AWS-url]: https://aws.amazon.com
