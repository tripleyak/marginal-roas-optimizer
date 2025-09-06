import { useState } from 'react';
import { ROASOptimizer } from '@/components/roas-optimizer/ROASOptimizer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">ROAS Optimizer</h1>
        <p className="text-muted-foreground mb-8">Testing if basic rendering works...</p>
        <ROASOptimizer />
      </div>
    </div>
  );
};

export default Index;