import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck } from 'lucide-react';
import { currency } from '../utils/formatters';
import { ASSET_COLORS } from '../constants';

export const AllocationChart = ({ allocationData }) => {
  return (
    <article className="card chart-card">
      <div className="card-head">
        <ShieldCheck size={18} />
        <span>Allocation</span>
      </div>
      {allocationData.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={allocationData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percentage }) => `${name} ${percentage}%`}
            >
              {allocationData.map((entry, index) => (
                <Cell key={entry.name} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => currency(value)} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="placeholder">Add assets to visualize your mix.</p>
      )}
    </article>
  );
};
