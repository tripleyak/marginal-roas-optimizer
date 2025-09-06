export const Header = () => {
  return (
    <header className="text-center space-y-3 mb-8">
      <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        ASIN Marginal ROAS Optimizer
        <span className="text-xl text-muted-foreground ml-3 font-normal">v6</span>
      </h1>
      <p className="text-muted-foreground max-w-4xl mx-auto text-lg">
        Waterfall allocation strategy: optimize spend until the <strong>next dollar</strong> returns your target. 
        Solve <em>f′(spend) = ρ</em> on the declining branch for maximum efficiency.
      </p>
    </header>
  );
};