"""
Mission Storage Manager
Handles performance scaling and database migration
Following spec section 6.1 - Performance Considerations
"""

import os
import json
import logging
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MissionPerformanceMonitor:
    """Monitor mission system performance for scaling decisions"""
    
    def __init__(self):
        self.metrics = {
            'load_times': [],
            'save_times': [],
            'query_times': [],
            'memory_usage': []
        }
        self.max_samples = 100  # Keep last 100 samples
    
    def record_load_time(self, duration: float):
        """Record mission load time"""
        self.metrics['load_times'].append(duration)
        if len(self.metrics['load_times']) > self.max_samples:
            self.metrics['load_times'].pop(0)
    
    def record_save_time(self, duration: float):
        """Record mission save time"""
        self.metrics['save_times'].append(duration)
        if len(self.metrics['save_times']) > self.max_samples:
            self.metrics['save_times'].pop(0)
    
    def record_query_time(self, duration: float):
        """Record mission query time"""
        self.metrics['query_times'].append(duration)
        if len(self.metrics['query_times']) > self.max_samples:
            self.metrics['query_times'].pop(0)
    
    def get_average_load_time(self) -> float:
        """Get average load time"""
        if not self.metrics['load_times']:
            return 0.0
        return sum(self.metrics['load_times']) / len(self.metrics['load_times'])
    
    def should_migrate_to_database(self) -> bool:
        """
        Determine if migration to database is needed
        From spec: "For large games (100+ missions), use a database"
        """
        avg_load_time = self.get_average_load_time()
        return avg_load_time > 0.5  # 500ms threshold


class MissionStorageManager:
    """
    Manages mission storage scaling from JSON to database
    From spec section 6.1: Performance considerations for 100+ missions
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.storage_type = self._determine_storage_type(config)
        self.storage_backend = None
        self.performance_monitor = MissionPerformanceMonitor()
        
        # Initialize appropriate storage backend
        self._create_storage_backend()
        
        logger.info(f"💾 Storage manager initialized with {self.storage_type} backend")
    
    def _determine_storage_type(self, config: Dict[str, Any]) -> str:
        """
        Determine appropriate storage type based on scale
        From spec: Scale thresholds for storage selection
        """
        mission_count = config.get('expected_mission_count', 0)
        
        if mission_count < 50:
            return 'json_files'
        elif mission_count < 100:
            return 'sqlite'
        else:
            return 'postgresql'
    
    def _create_storage_backend(self):
        """Create appropriate storage backend"""
        if self.storage_type == 'json_files':
            self.storage_backend = JSONFileStorage(self.config)
        elif self.storage_type == 'sqlite':
            self.storage_backend = SQLiteStorage(self.config)
        elif self.storage_type == 'postgresql':
            self.storage_backend = PostgreSQLStorage(self.config)
        else:
            raise ValueError(f"Unknown storage type: {self.storage_type}")
    
    def save_mission(self, mission_data: Dict[str, Any]) -> bool:
        """Save mission with performance monitoring"""
        start_time = time.time()
        
        try:
            result = self.storage_backend.save_mission(mission_data)
            save_time = time.time() - start_time
            self.performance_monitor.record_save_time(save_time)
            return result
        except Exception as e:
            logger.error(f"❌ Failed to save mission: {e}")
            return False
    
    def load_mission(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Load mission with performance monitoring"""
        start_time = time.time()
        
        try:
            result = self.storage_backend.load_mission(mission_id)
            load_time = time.time() - start_time
            self.performance_monitor.record_load_time(load_time)
            return result
        except Exception as e:
            logger.error(f"❌ Failed to load mission {mission_id}: {e}")
            return None
    
    def load_all_missions(self) -> List[Dict[str, Any]]:
        """Load all missions with performance monitoring"""
        start_time = time.time()
        
        try:
            result = self.storage_backend.load_all_missions()
            load_time = time.time() - start_time
            self.performance_monitor.record_load_time(load_time)
            return result
        except Exception as e:
            logger.error(f"❌ Failed to load missions: {e}")
            return []
    
    def query_missions(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query missions with performance monitoring"""
        start_time = time.time()
        
        try:
            result = self.storage_backend.query_missions(filters)
            query_time = time.time() - start_time
            self.performance_monitor.record_query_time(query_time)
            return result
        except Exception as e:
            logger.error(f"❌ Failed to query missions: {e}")
            return []
    
    def delete_mission(self, mission_id: str) -> bool:
        """Delete mission"""
        try:
            return self.storage_backend.delete_mission(mission_id)
        except Exception as e:
            logger.error(f"❌ Failed to delete mission {mission_id}: {e}")
            return False
    
    def migrate_to_database(self) -> bool:
        """
        Migrate from JSON files to database when threshold reached
        From spec: Performance scaling strategy
        """
        if self.storage_type != 'json_files':
            logger.warning("⚠️ Cannot migrate - already using database backend")
            return False
        
        try:
            # Load all missions from JSON
            json_missions = self.load_all_missions()
            logger.info(f"📂 Loaded {len(json_missions)} missions for migration")
            
            # Create new database backend
            new_config = self.config.copy()
            new_config['expected_mission_count'] = len(json_missions)
            new_storage_type = self._determine_storage_type(new_config)
            
            if new_storage_type == 'sqlite':
                db_backend = SQLiteStorage(new_config)
            else:
                db_backend = PostgreSQLStorage(new_config)
            
            # Migrate all missions
            migrated_count = 0
            for mission_data in json_missions:
                if db_backend.save_mission(mission_data):
                    migrated_count += 1
            
            # Update storage backend
            self.storage_backend = db_backend
            self.storage_type = new_storage_type
            
            # Archive JSON files
            self._archive_json_files()
            
            logger.info(f"🔄 Migration complete: {migrated_count}/{len(json_missions)} missions migrated to {new_storage_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
    
    def _archive_json_files(self):
        """Archive JSON files after successful migration"""
        import shutil
        import time
        
        data_dir = self.config.get('data_directory', 'missions')
        archive_dir = os.path.join(data_dir, 'archived', f'json_backup_{int(time.time())}')
        
        try:
            # Archive active missions
            active_dir = os.path.join(data_dir, 'active')
            if os.path.exists(active_dir):
                shutil.move(active_dir, os.path.join(archive_dir, 'active'))
            
            # Archive completed missions
            completed_dir = os.path.join(data_dir, 'completed')
            if os.path.exists(completed_dir):
                shutil.move(completed_dir, os.path.join(archive_dir, 'completed'))
            
            logger.info(f"🗄️ JSON files archived to {archive_dir}")
            
        except Exception as e:
            logger.error(f"❌ Failed to archive JSON files: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get storage performance statistics"""
        return {
            'storage_type': self.storage_type,
            'avg_load_time': self.performance_monitor.get_average_load_time(),
            'should_migrate': self.performance_monitor.should_migrate_to_database(),
            'metrics': {
                'load_samples': len(self.performance_monitor.metrics['load_times']),
                'save_samples': len(self.performance_monitor.metrics['save_times']),
                'query_samples': len(self.performance_monitor.metrics['query_times'])
            }
        }


class JSONFileStorage:
    """JSON file storage backend for small scale (< 50 missions)"""
    
    def __init__(self, config: Dict[str, Any]):
        self.data_directory = config.get('data_directory', 'missions')
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        for subdir in ['active', 'completed', 'templates', 'archived']:
            path = os.path.join(self.data_directory, subdir)
            os.makedirs(path, exist_ok=True)
    
    def save_mission(self, mission_data: Dict[str, Any]) -> bool:
        """Save mission to JSON file"""
        try:
            mission_id = mission_data['id']
            state = mission_data.get('state', 'Unknown')
            
            # Determine directory based on state
            if state == 'Completed':
                target_dir = os.path.join(self.data_directory, 'completed')
            else:
                target_dir = os.path.join(self.data_directory, 'active')
            
            filepath = os.path.join(target_dir, f"{mission_id}.json")
            with open(filepath, 'w') as f:
                json.dump(mission_data, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ JSON save failed: {e}")
            return False
    
    def load_mission(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Load mission from JSON file"""
        # Check both active and completed directories
        for subdir in ['active', 'completed']:
            filepath = os.path.join(self.data_directory, subdir, f"{mission_id}.json")
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r') as f:
                        return json.load(f)
                except Exception as e:
                    logger.error(f"❌ JSON load failed for {filepath}: {e}")
        
        return None
    
    def load_all_missions(self) -> List[Dict[str, Any]]:
        """Load all missions from JSON files"""
        missions = []
        
        for subdir in ['active', 'completed']:
            dir_path = os.path.join(self.data_directory, subdir)
            if os.path.exists(dir_path):
                for filename in os.listdir(dir_path):
                    if filename.endswith('.json'):
                        filepath = os.path.join(dir_path, filename)
                        try:
                            with open(filepath, 'r') as f:
                                mission_data = json.load(f)
                                missions.append(mission_data)
                        except Exception as e:
                            logger.error(f"❌ Failed to load {filepath}: {e}")
        
        return missions
    
    def query_missions(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query missions with basic filtering"""
        all_missions = self.load_all_missions()
        filtered = []
        
        for mission in all_missions:
            match = True
            
            for key, value in filters.items():
                if key not in mission or mission[key] != value:
                    match = False
                    break
            
            if match:
                filtered.append(mission)
        
        return filtered
    
    def delete_mission(self, mission_id: str) -> bool:
        """Delete mission JSON file"""
        for subdir in ['active', 'completed']:
            filepath = os.path.join(self.data_directory, subdir, f"{mission_id}.json")
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                    return True
                except Exception as e:
                    logger.error(f"❌ Failed to delete {filepath}: {e}")
        
        return False


class SQLiteStorage:
    """SQLite storage backend for medium scale (50-100 missions)"""
    
    def __init__(self, config: Dict[str, Any]):
        self.db_path = config.get('sqlite_path', 'missions.db')
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize SQLite database with mission tables"""
        import sqlite3
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create missions table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS missions (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    mission_type TEXT,
                    location TEXT,
                    faction TEXT,
                    state TEXT,
                    is_botched BOOLEAN,
                    reward_package_id INTEGER,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    data TEXT  -- JSON blob for full mission data
                )
            ''')
            
            # Create objectives table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS objectives (
                    id TEXT,
                    mission_id TEXT,
                    description TEXT,
                    is_achieved BOOLEAN,
                    is_optional BOOLEAN,
                    is_ordered BOOLEAN,
                    achieved_at TIMESTAMP,
                    PRIMARY KEY (id, mission_id),
                    FOREIGN KEY (mission_id) REFERENCES missions (id)
                )
            ''')
            
            # Create indexes for performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_state ON missions (state)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_location ON missions (location)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_faction ON missions (faction)')
            
            conn.commit()
            conn.close()
            
            logger.info(f"📊 SQLite database initialized: {self.db_path}")
            
        except Exception as e:
            logger.error(f"❌ SQLite initialization failed: {e}")
            raise
    
    def save_mission(self, mission_data: Dict[str, Any]) -> bool:
        """Save mission to SQLite database"""
        import sqlite3
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Insert or replace mission
            cursor.execute('''
                INSERT OR REPLACE INTO missions 
                (id, title, description, mission_type, location, faction, state, 
                 is_botched, reward_package_id, created_at, updated_at, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                mission_data['id'],
                mission_data['title'],
                mission_data['description'],
                mission_data.get('mission_type'),
                mission_data.get('location'),
                mission_data.get('faction'),
                mission_data['state'],
                mission_data.get('is_botched', False),
                mission_data.get('reward_package_id'),
                mission_data.get('created_at'),
                mission_data.get('updated_at'),
                json.dumps(mission_data)
            ))
            
            # Save objectives
            cursor.execute('DELETE FROM objectives WHERE mission_id = ?', (mission_data['id'],))
            
            for obj in mission_data.get('objectives', []):
                cursor.execute('''
                    INSERT INTO objectives 
                    (id, mission_id, description, is_achieved, is_optional, is_ordered, achieved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    obj['id'],
                    mission_data['id'],
                    obj['description'],
                    obj.get('is_achieved', False),
                    obj.get('is_optional', False),
                    obj.get('is_ordered', False),
                    obj.get('achieved_at')
                ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ SQLite save failed: {e}")
            return False
    
    def load_mission(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Load mission from SQLite database"""
        import sqlite3
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT data FROM missions WHERE id = ?', (mission_id,))
            row = cursor.fetchone()
            
            conn.close()
            
            if row:
                return json.loads(row[0])
            
            return None
            
        except Exception as e:
            logger.error(f"❌ SQLite load failed: {e}")
            return None
    
    def load_all_missions(self) -> List[Dict[str, Any]]:
        """Load all missions from SQLite database"""
        import sqlite3
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT data FROM missions')
            rows = cursor.fetchall()
            
            conn.close()
            
            return [json.loads(row[0]) for row in rows]
            
        except Exception as e:
            logger.error(f"❌ SQLite load all failed: {e}")
            return []
    
    def query_missions(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query missions with SQL filtering"""
        import sqlite3
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build WHERE clause
            where_clauses = []
            params = []
            
            for key, value in filters.items():
                if key in ['state', 'location', 'faction', 'mission_type']:
                    where_clauses.append(f"{key} = ?")
                    params.append(value)
                elif key == 'is_botched':
                    where_clauses.append("is_botched = ?")
                    params.append(value)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            sql = f"SELECT data FROM missions WHERE {where_sql}"
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            conn.close()
            
            return [json.loads(row[0]) for row in rows]
            
        except Exception as e:
            logger.error(f"❌ SQLite query failed: {e}")
            return []
    
    def delete_mission(self, mission_id: str) -> bool:
        """Delete mission from SQLite database"""
        import sqlite3
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM objectives WHERE mission_id = ?', (mission_id,))
            cursor.execute('DELETE FROM missions WHERE id = ?', (mission_id,))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ SQLite delete failed: {e}")
            return False


class PostgreSQLStorage:
    """PostgreSQL storage backend for large scale (100+ missions)"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.connection_params = {
            'host': config.get('postgres_host', 'localhost'),
            'database': config.get('postgres_database', 'planetz'),
            'user': config.get('postgres_user', 'planetz'),
            'password': config.get('postgres_password', ''),
            'port': config.get('postgres_port', 5432)
        }
        self._initialize_database()
    
    def _initialize_database(self):
        """Initialize PostgreSQL database with mission tables"""
        try:
            import psycopg2
            
            conn = psycopg2.connect(**self.connection_params)
            cursor = conn.cursor()
            
            # Create missions table with full text search
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS missions (
                    id VARCHAR PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    description TEXT,
                    mission_type VARCHAR,
                    location VARCHAR,
                    faction VARCHAR,
                    state VARCHAR,
                    is_botched BOOLEAN,
                    reward_package_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE,
                    updated_at TIMESTAMP WITH TIME ZONE,
                    data JSONB  -- JSONB for efficient querying
                );
            ''')
            
            # Create objectives table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS objectives (
                    id VARCHAR,
                    mission_id VARCHAR,
                    description TEXT,
                    is_achieved BOOLEAN,
                    is_optional BOOLEAN,
                    is_ordered BOOLEAN,
                    achieved_at TIMESTAMP WITH TIME ZONE,
                    PRIMARY KEY (id, mission_id),
                    FOREIGN KEY (mission_id) REFERENCES missions (id) ON DELETE CASCADE
                );
            ''')
            
            # Create indexes for performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_state ON missions (state)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_location ON missions (location)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_faction ON missions (faction)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_missions_data_gin ON missions USING GIN (data)')
            
            conn.commit()
            conn.close()
            
            logger.info(f"🐘 PostgreSQL database initialized")
            
        except ImportError:
            logger.error("❌ psycopg2 not installed - PostgreSQL backend unavailable")
            raise
        except Exception as e:
            logger.error(f"❌ PostgreSQL initialization failed: {e}")
            raise
    
    def save_mission(self, mission_data: Dict[str, Any]) -> bool:
        """Save mission to PostgreSQL database"""
        try:
            import psycopg2
            import psycopg2.extras
            
            conn = psycopg2.connect(**self.connection_params)
            cursor = conn.cursor()
            
            # Use UPSERT for mission
            cursor.execute('''
                INSERT INTO missions 
                (id, title, description, mission_type, location, faction, state, 
                 is_botched, reward_package_id, created_at, updated_at, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    mission_type = EXCLUDED.mission_type,
                    location = EXCLUDED.location,
                    faction = EXCLUDED.faction,
                    state = EXCLUDED.state,
                    is_botched = EXCLUDED.is_botched,
                    reward_package_id = EXCLUDED.reward_package_id,
                    updated_at = EXCLUDED.updated_at,
                    data = EXCLUDED.data
            ''', (
                mission_data['id'],
                mission_data['title'],
                mission_data['description'],
                mission_data.get('mission_type'),
                mission_data.get('location'),
                mission_data.get('faction'),
                mission_data['state'],
                mission_data.get('is_botched', False),
                mission_data.get('reward_package_id'),
                mission_data.get('created_at'),
                mission_data.get('updated_at'),
                psycopg2.extras.Json(mission_data)
            ))
            
            # Handle objectives
            cursor.execute('DELETE FROM objectives WHERE mission_id = %s', (mission_data['id'],))
            
            for obj in mission_data.get('objectives', []):
                cursor.execute('''
                    INSERT INTO objectives 
                    (id, mission_id, description, is_achieved, is_optional, is_ordered, achieved_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                ''', (
                    obj['id'],
                    mission_data['id'],
                    obj['description'],
                    obj.get('is_achieved', False),
                    obj.get('is_optional', False),
                    obj.get('is_ordered', False),
                    obj.get('achieved_at')
                ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL save failed: {e}")
            return False
    
    def load_mission(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Load mission from PostgreSQL database"""
        try:
            import psycopg2
            
            conn = psycopg2.connect(**self.connection_params)
            cursor = conn.cursor()
            
            cursor.execute('SELECT data FROM missions WHERE id = %s', (mission_id,))
            row = cursor.fetchone()
            
            conn.close()
            
            if row:
                return row[0]  # JSONB is automatically decoded
            
            return None
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL load failed: {e}")
            return None
    
    def load_all_missions(self) -> List[Dict[str, Any]]:
        """Load all missions from PostgreSQL database"""
        try:
            import psycopg2
            
            conn = psycopg2.connect(**self.connection_params)
            cursor = conn.cursor()
            
            cursor.execute('SELECT data FROM missions')
            rows = cursor.fetchall()
            
            conn.close()
            
            return [row[0] for row in rows]
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL load all failed: {e}")
            return []
    
    def query_missions(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Query missions with advanced PostgreSQL filtering"""
        try:
            import psycopg2
            
            conn = psycopg2.connect(**self.connection_params)
            cursor = conn.cursor()
            
            # Build WHERE clause with both column and JSONB filtering
            where_clauses = []
            params = []
            param_count = 0
            
            for key, value in filters.items():
                param_count += 1
                if key in ['state', 'location', 'faction', 'mission_type']:
                    where_clauses.append(f"{key} = %s")
                    params.append(value)
                elif key == 'is_botched':
                    where_clauses.append("is_botched = %s")
                    params.append(value)
                else:
                    # Use JSONB operators for custom field filtering
                    where_clauses.append(f"data->%s = %s")
                    params.extend([key, json.dumps(value)])
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"
            sql = f"SELECT data FROM missions WHERE {where_sql}"
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            
            conn.close()
            
            return [row[0] for row in rows]
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL query failed: {e}")
            return []
    
    def delete_mission(self, mission_id: str) -> bool:
        """Delete mission from PostgreSQL database"""
        try:
            import psycopg2
            
            conn = psycopg2.connect(**self.connection_params)
            cursor = conn.cursor()
            
            # Objectives will be deleted automatically due to CASCADE
            cursor.execute('DELETE FROM missions WHERE id = %s', (mission_id,))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL delete failed: {e}")
            return False
