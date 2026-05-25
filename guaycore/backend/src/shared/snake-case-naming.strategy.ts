import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class SnakeCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(propertyName: string, customName: string): string {
    return customName ?? propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  relationName(propertyName: string): string {
    return propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.columnName(relationName, '') + '_' + referencedColumnName;
  }

  joinTableColumnName(tableName: string, propertyName: string): string {
    return tableName + '_' + this.columnName(propertyName, '');
  }
}
