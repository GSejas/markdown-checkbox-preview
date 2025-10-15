import * as vscode from 'vscode';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

/**
 * Shared output channel logger for quick diagnostics.
 */
export class Logger {
  private static channel: vscode.OutputChannel | undefined;
  private static verboseEnabled: boolean = false;

  private static get output(): vscode.OutputChannel {
    if (!Logger.channel) {
      Logger.channel = vscode.window.createOutputChannel('Markdown Checkbox Preview');
    }
    return Logger.channel;
  }

  private static write(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();
    Logger.output.appendLine(`[${timestamp}] [${level}] ${message}`);
  }

  public static info(message: string): void {
    Logger.write('INFO', message);
  }

  public static warn(message: string): void {
    Logger.write('WARN', message);
  }

  public static error(message: string, error?: unknown): void {
    const details = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : `${error ?? ''}`;
    Logger.write('ERROR', `${message}${details ? ` | ${details}` : ''}`);
  }

  public static debug(message: string): void {
    if (Logger.verboseEnabled) {
      Logger.write('DEBUG', message);
    }
  }

  /**
   * Enable or disable verbose debug logging
   */
  public static setVerbose(enabled: boolean): void {
    Logger.verboseEnabled = enabled;
    Logger.info(`Verbose logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if verbose logging is enabled
   */
  public static isVerbose(): boolean {
    return Logger.verboseEnabled;
  }

  /**
   * Show the output channel
   */
  public static show(): void {
    Logger.output.show();
  }
}
