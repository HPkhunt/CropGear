# CropGear - Smart Equipment Rental System

A comprehensive web platform connecting farmers with equipment owners for agricultural machinery rentals, featuring real-time chat, secure transactions, and efficient equipment management.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB
- Redis (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cropgear
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env  # Configure your environment variables
   python -m uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:5175/
   - Backend API: http://127.0.0.1:8000/
   - API Docs: http://127.0.0.1:8000/docs

## 📖 Documentation

For comprehensive implementation details, please refer to:

**[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Complete technical documentation including:
- Architecture overview
- Database schema
- API endpoints
- Component structure
- Deployment guide
- Future enhancements

## 🎯 Key Features

- **Real-time Chat**: Direct messaging between farmers and equipment owners
- **Equipment Management**: Comprehensive equipment listing and booking system
- **Multi-role Authentication**: Support for farmers, owners, and administrators
- **Responsive Design**: Mobile-first approach with modern UI
- **Secure Transactions**: JWT authentication and payment integration
- **Admin Dashboard**: Complete administrative controls

## 🛠️ Tech Stack

- **Backend**: FastAPI, MongoDB, WebSocket
- **Frontend**: React, Vite, Axios
- **Authentication**: JWT tokens
- **Real-time**: WebSocket communication
- **File Storage**: AWS S3 integration
- **Deployment**: Docker support

## 📞 Support

For technical details, troubleshooting, and development guidelines, see [IMPLEMENTATION.md](IMPLEMENTATION.md).

---

*Built with ❤️ for modern agriculture*</content>
<parameter name="filePath">d:\cropgear\cropgear\README.md