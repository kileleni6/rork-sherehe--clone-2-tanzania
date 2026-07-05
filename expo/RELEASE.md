# Sherehe → TestFlight (EAS)

## 0) One-time setup

From this folder:

```powershell
cd c:\Users\Dell\Downloads\sherehe\expo
```

Install deps (already done if `node_modules` exists):

```powershell
npm install
```

Install EAS CLI and login:

```powershell
npm install -g eas-cli
eas login
```

## 1) Link to expo.dev (creates projectId)

```powershell
eas init
```

This writes `extra.eas.projectId` into `app.json`. Keep that change in your repo (and if you edit in Rork, make sure `app.json` stays synced so the `projectId` isn’t lost).

## 2) Configure builds

```powershell
eas build:configure
```

Then open `eas.json` and replace placeholders in `submit.production.ios`:

- `appleId`: your Apple ID email
- `ascAppId`: the numeric “Apple ID” from App Store Connect → App Information
- `appleTeamId`: your Apple Team ID

## 3) Build the iOS binary (.ipa)

```powershell
eas build -p ios --profile production
```

## 4) Submit to TestFlight

```powershell
eas submit -p ios --latest
```

