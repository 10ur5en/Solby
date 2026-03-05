# Deploy Solby to GitHub

Git is already initialized for this project and the initial commit has been created. Follow the steps below to push it to GitHub.

## 1. Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click **"+"** in the top right → **"New repository"**.
3. **Repository name:** `Solby` (or any name you prefer).
4. Select **Public**.
5. **Do not** check **"Initialize this repository with a README"** (the project already has a README).
6. Click **"Create repository"**.

## 2. Push the project to GitHub

**First**, make sure you have created the repository on GitHub in the step above.

The `origin` remote is set to `https://github.com/10ur5en/Solby.git`. If you need to push to a different account, update the URL:

```powershell
# Only if your username is different:
git remote set-url origin https://github.com/YOUR_USERNAME/Solby.git
```

Then push:

```powershell
git push -u origin main
```

## 3. Set your Git user info (optional)

To show your name and email in commits:

```bash
git config user.name "Your Name"
git config user.email "github@email.com"
```

---

**Security:** The `.env.local` file is in `.gitignore`, so it will not be pushed to GitHub. Anyone running the project elsewhere should copy `.env.example` and create their own `.env.local`.
