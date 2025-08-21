# Security Guidelines

This document outlines the security measures and practices implemented in the Screenshot Tool.

## 🔒 **Security Features**

### **Code Signing & Trust**
- **Windows**: Supports code signing with certificates stored in GitHub Secrets
- **macOS**: Supports code signing and Apple notarization for trusted distribution
- **Virus Scanning**: All Windows builds are automatically scanned with ClamAV
- **Artifact Verification**: SHA256 checksums provided for all builds

### **Privacy Protection**
- **100% Offline**: Zero network calls, no telemetry, no external dependencies
- **Local Storage Only**: All screenshots saved to local temp directories
- **No Analytics**: No user tracking or data collection
- **Open Source**: Full transparency of all code and functionality

### **Dependency Security**
- **Automated Audits**: npm audit runs on every build and PR
- **License Compliance**: Only MIT/ISC/Apache-2.0/BSD licenses allowed
- **Secret Scanning**: TruffleHog scans for accidentally committed secrets
- **Dependency Updates**: Regular dependency security updates

## 🛡️ **Security Measures**

### **Electron Security**
- **Context Isolation**: Enabled in all renderer processes
- **Node Integration**: Disabled in renderer processes for security
- **Preload Scripts**: Secure IPC communication through contextBridge
- **Sandboxing**: All file operations handled in main process only

### **Build Security**
- **Secure CI/CD**: All builds run in isolated GitHub Actions environments
- **Certificate Management**: Signing certificates stored securely in GitHub Secrets
- **Build Verification**: Each build artifact is verified and checksummed
- **Clean Environment**: Fresh build environment for every release

### **Runtime Security**
- **Single Instance**: Prevents multiple app instances from running
- **Temporary File Cleanup**: All temp files automatically cleaned up
- **Permission Requests**: Proper macOS screen recording permission handling
- **Memory Management**: Proper cleanup of screenshot data in memory

## 🔧 **Setting Up Code Signing**

### **Windows Code Signing**
To enable Windows code signing, add these secrets to your GitHub repository:

```
WINDOWS_CERTIFICATE: <base64-encoded .p12 certificate>
WINDOWS_CERT_PASSWORD: <certificate password>
```

### **macOS Code Signing & Notarization**
To enable macOS code signing and notarization, add these secrets:

```
MACOS_CERTIFICATE: <base64-encoded .p12 certificate>
MACOS_CERT_PASSWORD: <certificate password>
APPLE_ID: <your Apple ID email>
APPLE_ID_PASSWORD: <App-specific password>
APPLE_TEAM_ID: <your Apple Team ID>
```

### **Certificate Generation**
1. **Windows**: Obtain a code signing certificate from a trusted CA (DigiCert, GlobalSign, etc.)
2. **macOS**: Get a Developer ID certificate from Apple Developer Program
3. **Convert to base64**: `base64 -i certificate.p12 | pbcopy` (macOS) or `certutil -encode certificate.p12 certificate.b64` (Windows)

## 🚨 **Security Reporting**

### **Vulnerability Disclosure**
If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security concerns to: [maintainer-email]
3. Include detailed reproduction steps
4. Allow reasonable time for patching before disclosure

### **Supported Versions**
Security updates are provided for:
- Latest release version
- Previous major version (if applicable)

### **Security Response**
- **Critical**: Patched within 24-48 hours
- **High**: Patched within 1 week
- **Medium/Low**: Included in next regular release

## ✅ **Security Checklist**

### **Development**
- [ ] No hardcoded secrets or API keys
- [ ] All dependencies security audited
- [ ] Context isolation enabled
- [ ] Node integration disabled in renderers
- [ ] Secure IPC patterns used

### **Build**
- [ ] Code signing certificates configured
- [ ] Virus scanning passes
- [ ] Security audit passes
- [ ] No secrets in build logs
- [ ] Artifacts properly verified

### **Distribution**
- [ ] Release signed and notarized
- [ ] Checksums provided
- [ ] Release notes include security fixes
- [ ] Update mechanism secure (if implemented)

## 🔍 **Security Testing**

### **Automated Security Checks**
Our CI/CD pipeline includes:
- npm audit for dependency vulnerabilities
- Secret scanning with TruffleHog
- License compliance verification
- Network call detection (should be zero)
- Virus scanning of built artifacts

### **Manual Security Testing**
Regular security reviews include:
- Code review of all security-sensitive changes
- Testing on isolated networks (offline verification)
- Permission and access control testing
- Memory leak and cleanup verification

## 🛠️ **Security Tools**

### **Required Tools**
- **ClamAV**: Virus scanning
- **TruffleHog**: Secret detection
- **npm audit**: Dependency scanning
- **Jest**: Unit testing with security focus

### **Recommended Tools**
- **ESLint**: Code quality and security patterns
- **Snyk**: Advanced dependency scanning
- **OWASP ZAP**: Security testing (if web components added)

## 📋 **Compliance**

### **Privacy Standards**
- No personal data collection
- No network connectivity required
- All data processing local
- GDPR compliant by design (no data collection)

### **Security Standards**
- Follows OWASP Electron Security Guidelines
- Implements defense in depth
- Regular security updates
- Transparent security practices

---

**Last Updated**: [Current Date]
**Security Contact**: [Maintainer Email]