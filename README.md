# Miya Dairy v2 - Photo Gallery CMS

A modern, full-stack photo gallery CMS with AI-powered auto-tagging and organization.

## Features

### Core Functionality
- 📸 **Photo Upload & Management** - Upload photos with automatic processing
- 🤖 **AI Auto-Tagging** - Automatic photo analysis using MobileNet v2
- 🏷️ **Manual Organization** - Categories and tags management
- 🔒 **Authentication** - JWT-based admin authentication
- 🌐 **Public Gallery** - Beautiful public-facing photo gallery
- 🖼️ **HEIC Support** - Automatic HEIC to JPEG conversion
- 🎨 **Color Analysis** - Dominant color and palette extraction
- 📱 **Responsive Design** - Mobile-first UI with Tailwind CSS

### Technical Highlights
- **Monorepo Architecture** - npm workspaces with 4 packages
- **TypeScript** - End-to-end type safety
- **Duplicate Detection** - SHA-256 hash-based deduplication
- **Multi-Size Images** - Original, medium, and thumbnail variants
- **Async Processing** - Non-blocking ML analysis
- **Database Migrations** - Version-controlled schema changes

## Tech Stack

### Backend
- **NestJS 10** - Progressive Node.js framework
- **TypeORM** - ORM with PostgreSQL
- **PostgreSQL 15** - Relational database
- **ONNX Runtime** - ML inference engine
- **Sharp** - High-performance image processing
- **Passport.js** - Authentication middleware

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client

### Desktop App
- **Electron** - Cross-platform desktop app framework
- **TypeScript** - Type-safe development
- **electron-store** - Secure credential storage

### Infrastructure
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and static file serving

## Project Structure

```
miya-dairy-v2/
├── packages/
│   ├── backend/              # NestJS API server
│   │   ├── src/
│   │   │   ├── auth/         # Authentication module
│   │   │   ├── photos/       # Photo management
│   │   │   ├── categories/   # Category management
│   │   │   ├── tags/         # Tag management
│   │   │   ├── database/     # Entities & migrations
│   │   │   └── common/       # Shared utilities
│   │   └── package.json
│   ├── frontend-admin/       # Admin dashboard (React)
│   │   ├── src/
│   │   │   ├── api/          # API clients
│   │   │   ├── pages/        # Page components
│   │   │   └── App.tsx
│   │   └── package.json
│   ├── frontend-public/      # Public gallery (React)
│   │   ├── src/
│   │   │   ├── api/          # API clients
│   │   │   ├── components/   # Reusable components
│   │   │   ├── pages/        # Page components
│   │   │   └── App.tsx
│   │   └── package.json
│   ├── frontend-desktop/     # Desktop app (Electron)
│   │   ├── src/
│   │   │   ├── main/         # Electron main process
│   │   │   └── renderer/     # React UI
│   │   └── package.json
│   └── shared/               # Shared TypeScript types
│       ├── src/types/
│       └── package.json
├── infrastructure/
│   ├── nginx/                # Nginx configuration
│   └── ml-models/            # ONNX model files
├── docker-compose.yml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20 LTS
- PostgreSQL 15 (or Docker)
- npm 10+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd miya-dairy-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start PostgreSQL**
   ```bash
   docker compose up -d postgres
   ```

5. **Run database migrations**
   ```bash
   cd packages/backend
   npm run migration:run
   ```

6. **Build all packages**
   ```bash
   npm run build
   ```

### Development

Start all services in development mode:

```bash
# Terminal 1: Backend API
cd packages/backend
npm run dev

# Terminal 2: Admin Dashboard
cd packages/frontend-admin
npm run dev

# Terminal 3: Public Gallery
cd packages/frontend-public
npm run dev

# Terminal 4: Desktop App (Optional)
cd packages/frontend-desktop
npm run dev
```

- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:5173
- Public Gallery: http://localhost:5174
- Desktop App: Native macOS application

### Default Credentials

- **Username:** admin
- **Password:** admin123

⚠️ **Change these credentials in production!**

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Photos
- `POST /api/photos/upload` - Upload photo (auth required)
- `GET /api/photos` - List photos (public)
- `GET /api/photos/:id` - Get photo details
- `PUT /api/photos/:id` - Update photo (auth required)
- `DELETE /api/photos/:id` - Delete photo (auth required)

### Categories
- `POST /api/categories` - Create category (auth required)
- `GET /api/categories` - List categories
- `GET /api/categories/:id` - Get category
- `PUT /api/categories/:id` - Update category (auth required)
- `DELETE /api/categories/:id` - Delete category (auth required)

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags/photos/:photoId` - Add tag to photo (auth required)
- `DELETE /api/tags/photos/:photoId/:tagId` - Remove tag (auth required)

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=miya_dairy

# Backend
BACKEND_PORT=3000
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=20971520

# Frontend URLs
FRONTEND_ADMIN_URL=http://localhost:5173
FRONTEND_PUBLIC_URL=http://localhost:5174
```

## Database Schema

### Key Tables

- **users** - Admin users
- **photos** - Photo metadata and file paths
- **categories** - Photo categories
- **tags** - Photo tags
- **photo_tags** - Photo-tag associations (many-to-many)
- **analyses** - ML analysis results

### Key Features

- UUID primary keys
- Automatic timestamps
- Cascade deletions
- Indexed foreign keys
- JSONB for flexible data (ML results, color palettes)

## ML Model

The project uses **MobileNet v2** via ONNX Runtime for image classification.

### Setup ML Model

1. Download the model:
   ```bash
   # Place mobilenet-v2.onnx in infrastructure/ml-models/
   ```

2. The model is loaded on backend startup
3. If model is missing, mock analysis data is returned

### Model Performance

- Inference time: ~100-500ms per image
- Confidence threshold: 0.3
- Top predictions: 10 tags

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Manual Deployment

1. Build all packages:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Run migrations:
   ```bash
   cd packages/backend
   npm run migration:run
   ```

4. Start backend:
   ```bash
   cd packages/backend
   npm run start:prod
   ```

5. Serve frontend builds with Nginx or CDN

### Security Considerations

- ✅ Change default admin credentials
- ✅ Use strong JWT secret
- ✅ Enable HTTPS in production
- ✅ Configure CORS properly
- ✅ Set up rate limiting
- ✅ Regular security updates
- ✅ Backup database regularly

## Testing

```bash
# Backend unit tests
cd packages/backend
npm test

# Frontend tests
cd packages/frontend-admin
npm test
```

## Performance

### Image Processing
- HEIC conversion: ~200-500ms
- Thumbnail generation: ~50-100ms
- Color extraction: ~30-50ms

### ML Analysis
- Model inference: ~100-500ms
- Runs asynchronously after upload

### API Response Times
- Photo list: <100ms
- Photo upload: 1-3s (processing time)
- Photo detail: <50ms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Desktop Application

The Electron-based desktop app provides native macOS experience with:

- Native file picker integration
- Secure credential storage
- Offline-first architecture
- System tray integration

### Building Desktop App

```bash
cd packages/frontend-desktop

# Development
npm run dev

# Build for production
npm run build
npm run package

# Build for specific architecture
npm run package:arm64  # Apple Silicon (M1/M2)
npm run package:x64    # Intel processors
```

The built `.dmg` installer will be in `packages/frontend-desktop/release/`.

## Support

For issues and questions:
- GitHub Issues: [repository-issues-url]
- Documentation: [documentation-url]

## Acknowledgments

- MobileNet v2 by Google
- ONNX Runtime by Microsoft
- Sharp image processing library
- NestJS framework team
- Electron framework
