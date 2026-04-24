pipeline {
    agent any
    stages {
        stage('Clone Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/garrelokesh-lang/dpdp-compliance-checker.git'
            }
        }
        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    bat 'npm install'
                }
            }
        }
        stage('Run App') {
            steps {
                dir('backend') {
                    bat 'set PORT=3001 && npm start'
                }
            }
        }
    }
}
