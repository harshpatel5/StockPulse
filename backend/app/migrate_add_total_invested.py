"""
Migration script to add total_invested column to portfolio_history table.
Run this once to add the new column for existing databases.

Usage: python -m app.migrate_add_total_invested
"""
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import create_app
from app.models import db, PortfolioHistory, Asset
from sqlalchemy import text


def migrate():
    """Add total_invested column to portfolio_history table if it doesn't exist."""
    app = create_app()
    
    with app.app_context():
        # Check if column already exists
        try:
            # Try to query the column
            result = db.session.execute(text("SELECT total_invested FROM portfolio_history LIMIT 1"))
            print("Column 'total_invested' already exists. Migration not needed.")
            return
        except Exception:
            pass  # Column doesn't exist, proceed with migration
        
        # Add the column
        try:
            db.session.execute(text(
                "ALTER TABLE portfolio_history ADD COLUMN total_invested FLOAT"
            ))
            db.session.commit()
            print("Successfully added 'total_invested' column to portfolio_history table.")
        except Exception as e:
            print(f"Error adding column: {e}")
            db.session.rollback()
            return
        
        # Backfill existing records with calculated total_invested from assets
        # For historical records, we assume the invested amount equals the value (no gains/losses)
        # This is an approximation for legacy data
        try:
            # Get all history records without total_invested
            histories = PortfolioHistory.query.filter(
                PortfolioHistory.total_invested == None
            ).all()
            
            if histories:
                print(f"Found {len(histories)} records to backfill...")
                
                for h in histories:
                    # For legacy records, set total_invested = total_value
                    # This means legacy data shows 0% gain/loss, which is accurate
                    # since we don't know the actual cost basis at that time
                    h.total_invested = h.total_value
                
                db.session.commit()
                print(f"Successfully backfilled {len(histories)} records.")
            else:
                print("No records need backfilling.")
                
        except Exception as e:
            print(f"Error backfilling data: {e}")
            db.session.rollback()


if __name__ == "__main__":
    migrate()
