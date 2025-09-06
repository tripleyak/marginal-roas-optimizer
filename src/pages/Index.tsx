import { useState } from 'react';
import { ROASOptimizer } from '@/components/roas-optimizer/ROASOptimizer';

const Index = () => {
  console.log("Index component rendering...");
  
  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">ROAS Optimizer</h1>
        <p className="text-muted-foreground mb-8">Testing basic preview loading...</p>
        <div className="border border-border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground mb-4">If you can see this, basic rendering works.</p>
          <ROASOptimizer />
        </div>
      </div>
    </div>
  );
};

export default Index;