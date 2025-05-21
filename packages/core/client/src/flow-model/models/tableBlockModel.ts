import { DataBlockModel } from './dataBlockModel';
import { IModelComponentProps } from './flowModel';
import { ActionModel } from './actions/actionModel';
import { observable } from '@formily/reactive';
import { ArrayResource } from '../resources/arrayResource';
import { Application } from '../../application';

// TODO: 未完成

export class TableBlockModel<TData = any> extends DataBlockModel {
  public rowActions: Map<string, ActionModel>;
  declare public resource: ArrayResource<TData>;

  constructor(uid: string, app: Application, resource?: ArrayResource<TData>) {
    super(uid, app, resource);
    this.rowActions = observable(new Map<string, ActionModel>());
  }

  setRowActions(actions: ActionModel[]) {
    this.rowActions.clear();
    actions.forEach(action => this.rowActions.set(action.uid, action));
  }

  addRowAction(action: ActionModel) {
    this.rowActions.set(action.uid, action);
  }

  getRowAction(uid: string): ActionModel | undefined {
    return this.rowActions.get(uid);
  }

  removeRowAction(uid: string): boolean {
    return this.rowActions.delete(uid);
  }

  getRowActions(): ActionModel[] {
    return Array.from(this.rowActions.values());
  }

  async reload(): Promise<any[] | null> {
    return this.resource.reload();
  }

  async reset(): Promise<any[] | null> {
    this.resource.pagination.page = 1;
    this.resource.filter = {};
    this.resource.sort = [];
    return this.resource.load();
  }

  async applyFilter(filter: Record<string, any>): Promise<any[] | null> {
    this.resource.setFilter(filter);
    return this.resource.load();
  }

  async applySort(field: string, direction: 'asc' | 'desc'): Promise<any[] | null> {
    this.resource.setSort({
      field,
      direction
    });
    return this.resource.load();
  }



} 