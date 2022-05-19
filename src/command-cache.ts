import _localStorage from './local-storage';

export default class CommandCache {
  /**
   * The filepath where local storage data will be written
   * in node environments.
   */
  private loc: string;

  /**
   * The prefix applied to keys that are stored in localStorage.
   */
  private prefix: string;

  constructor(loc: string, prefix: string) {
    this.loc = loc;
    this.prefix = prefix;
  }

  public setItem(key: string, value: string): void {
    _localStorage.setItem(this.fKey(key), value);
  }

  public getItem(key: string): string | null {
    return _localStorage.getItem(this.fKey(key));
  }

  public hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  public removeItem(key: string): void {
    _localStorage.removeItem(this.fKey(key));
  }

  private fKey(key: string): string {
    return `${this.prefix}_${key}`;
  }
}
