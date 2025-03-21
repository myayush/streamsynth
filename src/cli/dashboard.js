const chalk = require('chalk');

/**
 * Simple console-based dashboard for pipeline monitoring
 */
class Dashboard {
  constructor(engine) {
    this.engine = engine;
    this.stats = {
      processed: 0,
      filtered: 0,
      errors: 0,
      spillovers: 0,
      startTime: null,
      lastUpdate: null
    };
    
    this.interval = null;
  }
  
  start() {
    this.stats.startTime = Date.now();
    this.stats.lastUpdate = Date.now();
    
    // Set up event listeners
    this.engine.on('processed', () => {
      this.stats.processed++;
    });
    
    this.engine.on('filtered', () => {
      this.stats.filtered++;
    });
    
    this.engine.on('error', () => {
      this.stats.errors++;
    });
    
    this.engine.on('spillover', () => {
      this.stats.spillovers++;
    });
    
    // Start update interval
    this.interval = setInterval(() => this.update(), 1000);
    
    // Clear screen and draw initial dashboard
    console.clear();
    this.draw();
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  update() {
    const now = Date.now();
    this.stats.lastUpdate = now;
    this.draw();
  }
  
  draw() {
    console.clear();
    const runtime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const eventsPerSecond = runtime > 0 ? (this.stats.processed / runtime).toFixed(2) : 0;
    
    console.log(chalk.bold('=== StreamSynth Dashboard ==='));
    console.log(`${chalk.blue('Runtime')}: ${runtime}s`);
    console.log(`${chalk.green('Events Processed')}: ${this.stats.processed}`);
    console.log(`${chalk.yellow('Events Filtered')}: ${this.stats.filtered}`);
    console.log(`${chalk.cyan('Processing Rate')}: ${eventsPerSecond} events/sec`);
    console.log(`${chalk.red('Errors')}: ${this.stats.errors}`);
    console.log(`${chalk.magenta('Spillovers')}: ${this.stats.spillovers}`);
    console.log(chalk.bold('============================='));
    console.log('Press Ctrl+C to stop');
  }
}

module.exports = Dashboard;