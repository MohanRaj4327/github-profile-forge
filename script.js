/**
 * ============================================================================
 * ProfileForge - Logic & Prompt Generator (script.js)
 * Created by Mohan Raj (@mohan_raj.explains)
 * Plain JavaScript, 100% Client-Side, Free GitHub API
 * ============================================================================
 */

// Global State
let currentProfile = null;
let allRepositories = [];
let selectedRepoNames = new Set();

// GitHub official language colors mapping for authentic developer badges
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#563d7c',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Swift: '#F05138',
  Shell: '#89e051'
};

// DOM Elements
const usernameInput = document.getElementById('username-input');
const fetchBtn = document.getElementById('fetch-btn');
const fetchSpinner = document.getElementById('fetch-spinner');
const statusMessage = document.getElementById('status-message');

const profilePreview = document.getElementById('profile-preview');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileLogin = document.getElementById('profile-login');
const profileBio = document.getElementById('profile-bio');

const reposContainer = document.getElementById('repos-container');
const reposList = document.getElementById('repos-list');
const noReposMessage = document.getElementById('no-repos-message');
const showForksCheckbox = document.getElementById('show-forks-checkbox');
const selectedCounter = document.getElementById('selected-counter');

const skillsInput = document.getElementById('skills-input');
const aboutInput = document.getElementById('about-input');
const typingInput = document.getElementById('typing-input');
const linkedinInput = document.getElementById('linkedin-input');
const emailInput = document.getElementById('email-input');

const promptOutput = document.getElementById('prompt-output');
const copyPromptBtn = document.getElementById('copy-prompt-btn');
const copyFeedback = document.getElementById('copy-feedback');

const copySnakeBtn = document.getElementById('copy-snake-btn');
const copySnakeFeedback = document.getElementById('copy-snake-feedback');
const snakeCodeElement = document.getElementById('snake-code');

/**
 * Show a user-friendly alert message box
 */
function showStatus(text, type = 'error') {
  statusMessage.textContent = text;
  statusMessage.className = `status-box ${type}`;
  statusMessage.style.display = 'block';
}

/**
 * Hide the status message box
 */
function hideStatus() {
  statusMessage.style.display = 'none';
  statusMessage.textContent = '';
}

/**
 * Update the selected repo counter pill (e.g. "2 / 4 Selected") with a pop animation
 */
function updateCounter() {
  if (selectedCounter) {
    selectedCounter.textContent = `${selectedRepoNames.size} / 4 Selected`;
    selectedCounter.classList.remove('bounce-pop');
    // Trigger reflow to restart animation
    void selectedCounter.offsetWidth;
    selectedCounter.classList.add('bounce-pop');
  }
}

/**
 * Helper to safely URL-encode text for shields.io badges and typing animations
 */
function safeUrlEncode(str) {
  if (!str) return '';
  return encodeURIComponent(str)
    .replace(/\+/g, '%2B')
    .replace(/'/g, '%27');
}

/**
 * Clean user input to extract pure GitHub username
 * Handles: full URLs ("https://github.com/username"), "@username", and trailing slashes
 */
function cleanGitHubUsername(rawInput) {
  if (!rawInput) return '';
  let clean = rawInput.trim();
  // Remove protocol (http:// or https://)
  clean = clean.replace(/^https?:\/\//i, '');
  // Remove www.
  clean = clean.replace(/^www\./i, '');
  // Remove github.com/
  clean = clean.replace(/^github\.com\//i, '');
  // Remove leading @
  clean = clean.replace(/^@+/, '');
  // Remove trailing slashes and any sub-paths (e.g. /repositories or /)
  clean = clean.split('/')[0];
  // Remove query params or hashes
  clean = clean.split('?')[0].split('#')[0];
  return clean.trim();
}

/**
 * Fetch GitHub user profile and public repositories
 */
async function fetchGitHubData() {
  const rawInput = usernameInput.value.trim();
  const username = cleanGitHubUsername(rawInput);

  // Auto-update input field so the user sees the clean username
  if (username) {
    usernameInput.value = username;
  }

  // Validate empty input
  if (!username) {
    showStatus('⚠️ Please type your GitHub username before clicking fetch!', 'warning');
    usernameInput.focus();
    return;
  }

  hideStatus();
  fetchBtn.disabled = true;
  fetchSpinner.style.display = 'inline-block';

  try {
    // 1. Fetch User Profile
    const userUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
    const userRes = await fetch(userUrl);

    if (userRes.status === 404) {
      throw new Error(`GitHub user "${username}" was not found. Please double-check the spelling!`);
    } else if (userRes.status === 403) {
      throw new Error('GitHub hourly rate limit reached (60 requests/hr). Please wait a few minutes and try again.');
    } else if (!userRes.ok) {
      throw new Error(`GitHub returned an error (Status ${userRes.status}). Please try again later.`);
    }

    const userData = await userRes.json();
    currentProfile = userData;

    // Display Profile Preview
    profileAvatar.src = userData.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
    profileName.textContent = userData.name || userData.login;
    profileLogin.textContent = `@${userData.login}`;
    profileBio.textContent = userData.bio ? userData.bio : 'No bio provided on GitHub profile yet.';
    profilePreview.style.display = 'flex';

    // 2. Fetch User Repositories (up to 100, sorted by updated date)
    const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;
    const reposRes = await fetch(reposUrl);

    if (reposRes.ok) {
      allRepositories = await reposRes.json();
    } else {
      allRepositories = [];
    }

    // Reset selected repo list
    selectedRepoNames.clear();

    // Auto-select up to 2 popular non-fork repos as friendly defaults
    const nonForks = allRepositories.filter(r => !r.fork);
    const defaults = (nonForks.length > 0 ? nonForks : allRepositories).slice(0, 2);
    defaults.forEach(repo => selectedRepoNames.add(repo.name));

    // Render repository list & counter
    renderRepositories();
    updateCounter();

    showStatus(`✔ Successfully loaded details for @${userData.login}!`, 'success');
    updatePrompt();

  } catch (err) {
    if (!navigator.onLine || err.message.toLowerCase().includes('failed to fetch')) {
      showStatus('🌐 Network Error: Could not connect to GitHub. Please check your internet connection.', 'error');
    } else {
      showStatus(`❌ ${err.message}`, 'error');
    }
    profilePreview.style.display = 'none';
    reposContainer.style.display = 'none';
  } finally {
    fetchBtn.disabled = false;
    fetchSpinner.style.display = 'none';
  }
}

/**
 * Render the list of repositories as clickable checkbox cards
 */
function renderRepositories() {
  const showForks = showForksCheckbox.checked;

  const visibleRepos = allRepositories.filter(repo => {
    if (showForks) return true;
    return !repo.fork;
  });

  reposList.innerHTML = '';

  if (visibleRepos.length === 0) {
    noReposMessage.style.display = 'block';
    reposList.style.display = 'none';
  } else {
    noReposMessage.style.display = 'none';
    reposList.style.display = 'grid';

    visibleRepos.forEach(repo => {
      const card = document.createElement('div');
      const isChecked = selectedRepoNames.has(repo.name);
      card.className = `repo-card ${isChecked ? 'selected' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'repo-checkbox';
      checkbox.checked = isChecked;

      const content = document.createElement('div');
      content.className = 'repo-card-content';

      const titleRow = document.createElement('div');
      titleRow.className = 'repo-title-row';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'repo-name';
      nameSpan.textContent = repo.name;
      titleRow.appendChild(nameSpan);

      // Language pill with authentic color dot
      if (repo.language) {
        const langPill = document.createElement('span');
        langPill.className = 'lang-pill';

        const dot = document.createElement('span');
        dot.className = 'lang-dot';
        dot.style.backgroundColor = LANG_COLORS[repo.language] || '#a855f7';

        langPill.appendChild(dot);
        langPill.appendChild(document.createTextNode(repo.language));
        titleRow.appendChild(langPill);
      }

      const descP = document.createElement('p');
      descP.className = 'repo-desc';
      descP.textContent = repo.description || 'No description provided for this repository.';

      const metaDiv = document.createElement('div');
      metaDiv.className = 'repo-meta';
      metaDiv.innerHTML = `<span>⭐ ${repo.stargazers_count || 0} stars</span>${repo.fork ? '<span>• (Forked)</span>' : ''}`;

      content.appendChild(titleRow);
      content.appendChild(descP);
      content.appendChild(metaDiv);

      card.appendChild(checkbox);
      card.appendChild(content);
      card.setAttribute('data-tilt', 'true');
      initTiltOnElement(card);

      // Handle card click
      const handleToggle = (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }

        if (checkbox.checked) {
          if (selectedRepoNames.size >= 4) {
            checkbox.checked = false;
            alert('⚠️ You can pick up to 4 featured projects! Please uncheck one before selecting another.');
            return;
          }
          selectedRepoNames.add(repo.name);
          card.classList.add('selected');
        } else {
          selectedRepoNames.delete(repo.name);
          card.classList.remove('selected');
        }

        updateCounter();
        updatePrompt();
      };

      card.addEventListener('click', handleToggle);
      reposList.appendChild(card);
    });
  }

  reposContainer.style.display = 'block';
}

/**
 * Generate the master ChatGPT prompt based on user data and inputs
 */
function updatePrompt() {
  if (!currentProfile) {
    promptOutput.value = 'Please type your GitHub username and click "Fetch My GitHub" first.';
    return;
  }

  const username = currentProfile.login;
  const fullName = currentProfile.name || currentProfile.login;
  const githubBio = currentProfile.bio || '';

  const userSkills = skillsInput.value.trim() || 'HTML, CSS, JavaScript, Python, Git, VS Code';
  const aboutMe = aboutInput.value.trim() || 'College student passionate about technology, software development, and problem solving.';
  
  const rawTyping = typingInput.value.trim() || 'Aspiring Software Engineer; Problem Solver; Tech Enthusiast';
  const typingList = rawTyping.split(';').map(t => t.trim()).filter(Boolean);
  const encodedTypingLines = typingList.map(t => safeUrlEncode(t)).join(';');

  const linkedinUrl = linkedinInput.value.trim();
  const emailAddr = emailInput.value.trim();

  const chosenRepos = allRepositories.filter(r => selectedRepoNames.has(r.name));

  const repoLanguages = Array.from(
    new Set(allRepositories.map(r => r.language).filter(Boolean))
  );

  let chosenReposDataText = '';
  if (chosenRepos.length === 0) {
    chosenReposDataText = 'No specific repositories selected by user.';
  } else {
    chosenReposDataText = chosenRepos.map((r, idx) => {
      return `Project ${idx + 1}:
- Name: ${r.name}
- URL: ${r.html_url}
- Primary Language: ${r.language || 'General / Markdown'}
- GitHub Description: ${r.description || 'Project built for learning and demonstration'}`;
    }).join('\n\n');
  }

  let pinnedRepoCardsMarkdown = '';
  if (chosenRepos.length > 0) {
    pinnedRepoCardsMarkdown = '\n<div align="center">\n' + chosenRepos.map(r => {
      return `  <a href="${r.html_url}">
    <img src="https://github-stats-extended.vercel.app/api/pin/?username=${username}&repo=${r.name}&theme=tokyonight&hide_border=true" alt="${r.name}" />
  </a>`;
    }).join('\n') + '\n</div>\n';
  }

  let socialBadgesMarkdown = '';
  if (linkedinUrl) {
    socialBadgesMarkdown += `  <a href="${linkedinUrl}" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>\n`;
  }
  if (emailAddr) {
    socialBadgesMarkdown += `  <a href="mailto:${emailAddr}">
    <img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>\n`;
  }
  socialBadgesMarkdown += `  <a href="https://github.com/${username}">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Profile" />
  </a>`;

  const encodedBannerText = safeUrlEncode(`Hi there, I'm ${fullName}`);

  const fullPrompt = `You are helping me create my GitHub profile README.md. Return ONLY the final README in one markdown code block, with nothing before or after it.

============================================================
MY DATA:
============================================================
- Full Name: ${fullName}
- GitHub Username: ${username}
- Original GitHub Bio: ${githubBio || 'None'}
- About Me (in my words): ${aboutMe}
- My Skills & Tools: ${userSkills}
- Typing Animation Lines: ${typingList.join(' | ')}
- Languages detected in my repositories: ${repoLanguages.length > 0 ? repoLanguages.join(', ') : 'Not specified'}
- LinkedIn: ${linkedinUrl || 'None'}
- Email: ${emailAddr || 'None'}

SELECTED FEATURED PROJECTS:
${chosenReposDataText}

============================================================
README SKELETON (Do NOT alter my username, image URLs or layout):
============================================================
<!-- HEADER BANNER -->
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=auto&height=200&section=header&text=${encodedBannerText}&fontSize=38&fontAlignY=38&animation=fadeIn" width="100%" alt="Header Banner" />
</div>

<!-- TYPING ANIMATION -->
<div align="center">
  <a href="https://github.com/${username}">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=22C55E&center=true&vCenter=true&width=500&lines=${encodedTypingLines}" alt="Typing Animation" />
  </a>
</div>

<br/>

<!-- ABOUT ME -->
## 👨‍💻 About Me
{{BIO}}

<br/>

<!-- SKILLS & TECH STACK -->
## 🛠 Tech Stack
{{SKILL_SECTIONS}}

<br/>

<!-- FEATURED PROJECTS -->
## 🚀 Featured Projects
{{PROJECT_DESCRIPTIONS}}
${pinnedRepoCardsMarkdown}
<br/>

<!-- GITHUB ANALYTICS -->
## 📊 GitHub Analytics
<div align="center">
  <img src="https://github-stats-extended.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_border=true" alt="GitHub Stats" />
  <img src="https://github-stats-extended.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight&hide_border=true" alt="Top Languages" />
</div>

<br/>

<!-- CONTRIBUTION SNAKE -->
## 🐍 Contribution Activity
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/github-snake-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/${username}/${username}/output/github-snake.svg">
    <img alt="GitHub Contribution Snake" src="https://raw.githubusercontent.com/${username}/${username}/output/github-snake.svg" />
  </picture>
</div>

<br/>

<!-- CONNECT WITH ME -->
## 📬 Connect With Me
<div align="center">
${socialBadgesMarkdown}
</div>

============================================================
STRICT RULES FOR CHATGPT:
============================================================
1. Do NOT change any URL, username, image link, or markdown structure in the skeleton. Keep all existing HTML and Markdown intact.
2. Replace {{BIO}} with a 2-line professional intro based ONLY on my data.
3. Replace {{SKILL_SECTIONS}} with shields.io badges in this exact format:
   https://img.shields.io/badge/NAME-HEXCOLOR?style=for-the-badge&logo=LOGO&logoColor=white
   - Group skills into clean categories using H3 headers:
     ### 🌐 Languages
     ### 🎨 Frontend
     ### ⚙️ Backend & Database
     ### 🧰 Tools & Platforms
     ### 🤖 AI & Other
   - Skip any category that has no matching skills.
   - URL-encode names properly (e.g. C++ becomes C%2B%2B, Node.js becomes Node.js).
   - If not sure of the exact SimpleIcons logo name, omit the logo parameter so the badge renders cleanly with text and color.
4. Replace {{PROJECT_DESCRIPTIONS}} with one concise bullet point per chosen repository, summarizing what it does using ONLY the repo data provided. If no repos were selected, omit the {{PROJECT_DESCRIPTIONS}} placeholder gracefully.
5. Use ONLY the skills, projects, and facts provided. Do NOT invent new skills, degrees, or employers.
6. Return ONLY the final README inside one markdown code block (\`\`\`markdown ... \`\`\`).`;

  promptOutput.value = fullPrompt;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, feedbackElement) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = text;
      tempTextArea.style.position = 'fixed';
      tempTextArea.style.left = '-9999px';
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);
    }

    feedbackElement.style.display = 'inline';
    setTimeout(() => {
      feedbackElement.style.display = 'none';
    }, 2500);
  } catch (err) {
    alert('Failed to copy. Please manually select the text and press Ctrl+C / Cmd+C.');
  }
}

// Auto-clean URL or @ if pasted or typed into username input
usernameInput.addEventListener('input', () => {
  const currentVal = usernameInput.value;
  if (currentVal.includes('github.com') || currentVal.includes('http') || currentVal.startsWith('@')) {
    usernameInput.value = cleanGitHubUsername(currentVal);
  }
});

// Event Listeners
fetchBtn.addEventListener('click', fetchGitHubData);

usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    fetchGitHubData();
  }
});

showForksCheckbox.addEventListener('change', () => {
  renderRepositories();
  updatePrompt();
});

skillsInput.addEventListener('input', updatePrompt);
aboutInput.addEventListener('input', updatePrompt);
typingInput.addEventListener('input', updatePrompt);
linkedinInput.addEventListener('input', updatePrompt);
emailInput.addEventListener('input', updatePrompt);

copyPromptBtn.addEventListener('click', () => {
  if (!currentProfile) {
    alert('Please fetch your GitHub profile first!');
    return;
  }
  copyToClipboard(promptOutput.value, copyFeedback);
});

copySnakeBtn.addEventListener('click', () => {
  copyToClipboard(snakeCodeElement.textContent.trim(), copySnakeFeedback);
});

// ============================================================================
// 3D INTERACTIVE ENGINE (100% Plain JavaScript, Zero External Libraries)
// ============================================================================

/**
 * Attaches real-time 3D tilt with holographic light glare to any card element
 * @param {HTMLElement} el - The element to tilt in 3D
 */
function initTiltOnElement(el) {
  if (!el || el.dataset.tiltInitialized) return;
  el.dataset.tiltInitialized = 'true';

  // Create and inject the dynamic specular glare overlay
  let glare = el.querySelector('.tilt-glare-overlay');
  if (!glare) {
    glare = document.createElement('div');
    glare.className = 'tilt-glare-overlay';
    el.appendChild(glare);
  }

  let isHovered = false;

  el.addEventListener('pointerenter', () => {
    isHovered = true;
    el.style.transition = 'transform 0.1s ease-out, box-shadow 0.2s';
    glare.style.opacity = '0.55';
  });

  el.addEventListener('pointermove', (e) => {
    if (!isHovered) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized coordinates from -0.5 (left/top) to +0.5 (right/bottom)
    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;

    // Calculate 3D rotation angles (up to 12 degrees)
    const rotX = (-normY * 14).toFixed(2);
    const rotY = (normX * 14).toFixed(2);

    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;

    // Position the holographic glare where the light shines
    const glareX = ((normX + 0.5) * 100).toFixed(1);
    const glareY = ((normY + 0.5) * 100).toFixed(1);
    glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.45) 0%, transparent 65%)`;
  });

  el.addEventListener('pointerleave', () => {
    isHovered = false;
    el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s';
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    glare.style.opacity = '0';
  });
}

/**
 * Initialize 3D tilt across all registered cards on the page
 */
function initAllTiltCards() {
  const cards = document.querySelectorAll('[data-tilt="true"]');
  cards.forEach(card => initTiltOnElement(card));
}

/**
 * 3D Interactive Space Canvas:
 * Renders an interactive 3D universe with depth-projected nodes, 
 * glowing cyber lines, and floating 3D wireframe shapes.
 */
function init3DSpaceCanvas() {
  const canvas = document.getElementById('space-3d-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // 3D Camera & Rotation state
  let rotX = 0;
  let rotY = 0;
  let targetRotX = 0;
  let targetRotY = 0;

  // Mouse interaction
  window.addEventListener('pointermove', (e) => {
    const normX = (e.clientX / width) - 0.5;
    const normY = (e.clientY / height) - 0.5;
    targetRotY = normX * 0.8;
    targetRotX = -normY * 0.6;
  });

  // Mobile gyroscope tilt interaction
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma !== null && e.beta !== null) {
        targetRotY = (e.gamma / 45) * 0.6;
        targetRotX = ((e.beta - 45) / 45) * 0.4;
      }
    });
  }

  // Generate 140 3D Star / Node Coordinates
  const numPoints = 140;
  const points = [];
  const spaceSize = 800;

  for (let i = 0; i < numPoints; i++) {
    points.push({
      x: (Math.random() - 0.5) * spaceSize * 2,
      y: (Math.random() - 0.5) * spaceSize * 1.5,
      z: (Math.random() - 0.5) * spaceSize * 1.5,
      baseRadius: Math.random() * 1.8 + 0.8,
      hue: Math.random() > 0.5 ? 210 : 160 // Cyan and Emerald accents
    });
  }

  // Floating 3D Wireframe Cube Model
  const cubeVertices = [
    { x: -70, y: -70, z: -70 }, { x: 70, y: -70, z: -70 },
    { x: 70, y: 70, z: -70 },   { x: -70, y: 70, z: -70 },
    { x: -70, y: -70, z: 70 },  { x: 70, y: -70, z: 70 },
    { x: 70, y: 70, z: 70 },    { x: -70, y: 70, z: 70 }
  ];
  const cubeEdges = [
    [0,1],[1,2],[2,3],[3,0], // back face
    [4,5],[5,6],[6,7],[7,4], // front face
    [0,4],[1,5],[2,6],[3,7]  // connecting edges
  ];

  // Floating 3D Octahedron Model
  const octVertices = [
    { x: 0, y: -80, z: 0 },
    { x: 0, y: 80, z: 0 },
    { x: -60, y: 0, z: -60 },
    { x: 60, y: 0, z: -60 },
    { x: 60, y: 0, z: 60 },
    { x: -60, y: 0, z: 60 }
  ];
  const octEdges = [
    [0,2],[0,3],[0,4],[0,5],
    [1,2],[1,3],[1,4],[1,5],
    [2,3],[3,4],[4,5],[5,2]
  ];

  let cubeSpin = 0;
  const fov = 700; // Focal length for 3D perspective projection

  /**
   * 3D Perspective Projection Math
   */
  function project(p, angleX, angleY, offX, offY) {
    // Rotate around Y
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const x1 = p.x * cosY - p.z * sinY;
    const z1 = p.x * sinY + p.z * cosY;

    // Rotate around X
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const y1 = p.y * cosX - z1 * sinX;
    const z2 = p.y * sinX + z1 * cosX;

    // Apply Perspective Scale
    const scale = fov / (fov + z2 + 800);
    return {
      x: offX + x1 * scale,
      y: offY + y1 * scale,
      scale: scale,
      z: z2
    };
  }

  // Animation Loop
  function render() {
    ctx.clearRect(0, 0, width, height);

    // Smooth camera damping (Lerp)
    rotX += (targetRotX - rotX) * 0.05;
    rotY += (targetRotY - rotY) * 0.05;
    cubeSpin += 0.008;

    const centerX = width / 2;
    const centerY = height / 2;

    // Project all points into 2D screen coordinates
    const projectedPoints = points.map(p => {
      const proj = project(p, rotX, rotY, centerX, centerY);
      return { ...proj, hue: p.hue, baseRadius: p.baseRadius };
    });

    // 1. Draw 3D Connecting Lines between nearby nodes
    const maxDist = 130;
    ctx.lineWidth = 1;
    for (let i = 0; i < projectedPoints.length; i++) {
      for (let j = i + 1; j < projectedPoints.length; j++) {
        const p1 = projectedPoints[i];
        const p2 = projectedPoints[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * Math.min(p1.scale, p2.scale) * 0.35;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // 2. Draw 3D Glowing Nodes
    for (const p of projectedPoints) {
      if (p.scale <= 0) continue;
      const radius = Math.max(0.6, p.baseRadius * p.scale * 1.5);
      const alpha = Math.min(1, p.scale * 1.2);

      ctx.fillStyle = p.hue === 160 
        ? `rgba(52, 211, 153, ${alpha})` 
        : `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Floating 3D Wireframe Cube (Upper Right)
    const cubeProj = cubeVertices.map(v => 
      project(v, rotX + cubeSpin, rotY + cubeSpin * 0.7, width * 0.82, height * 0.28)
    );
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.45)';
    ctx.lineWidth = 1.5;
    cubeEdges.forEach(([start, end]) => {
      const p1 = cubeProj[start];
      const p2 = cubeProj[end];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 4. Draw Floating 3D Wireframe Octahedron (Lower Left)
    const octProj = octVertices.map(v => 
      project(v, rotX - cubeSpin * 0.8, rotY - cubeSpin * 0.6, width * 0.16, height * 0.75)
    );
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 1.5;
    octEdges.forEach(([start, end]) => {
      const p1 = octProj[start];
      const p2 = octProj[end];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

// Initialize 3D engines when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initAllTiltCards();
  init3DSpaceCanvas();
});

// Also initialize immediately in case DOM is already loaded
initAllTiltCards();
init3DSpaceCanvas();
