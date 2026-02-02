import {
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type ExpandedState,
  type RowSelectionState,
  type Row,
  type Table as TanStackTable,
  type PaginationState,
} from '@tanstack/react-table'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/20/solid'
import { cn } from '../../index'
import { Spin } from '../../feedback/Spin'

/**
 * 表格尺寸类型
 */
export type TableSize = 'small' | 'middle' | 'large'

/**
 * 列定义类型（扩展 TanStack 列定义）
 */
export interface TableColumn<TData> extends Omit<ColumnDef<TData, unknown>, 'header' | 'cell'> {
  /** 列标题 */
  title?: ReactNode
  /** 列数据索引（作为 accessorKey 别名） */
  dataIndex?: string
  /** 列键值 */
  key?: string
  /** 宽度 */
  width?: number | string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否可排序 */
  sorter?: boolean | ((a: TData, b: TData) => number)
  /** 是否固定列 */
  fixed?: 'left' | 'right'
  /** 自定义渲染 */
  render?: (value: unknown, record: TData, index: number) => ReactNode
  /** 原始 header（兼容 TanStack） */
  header?: ColumnDef<TData, unknown>['header']
  /** 原始 cell（兼容 TanStack） */
  cell?: ColumnDef<TData, unknown>['cell']
  /** 子列 */
  children?: TableColumn<TData>[]
}

/**
 * 分页配置
 */
export interface TablePagination {
  /** 当前页码 */
  current?: number
  /** 每页条数 */
  pageSize?: number
  /** 总条数 */
  total?: number
  /** 是否显示快速跳转 */
  showQuickJumper?: boolean
  /** 是否显示每页条数选择 */
  showSizeChanger?: boolean
  /** 每页条数选项 */
  pageSizeOptions?: number[]
  /** 页码改变回调 */
  onChange?: (page: number, pageSize: number) => void
  /** 是否显示总条数 */
  showTotal?: boolean | ((total: number, range: [number, number]) => ReactNode)
}

/**
 * 行选择配置
 */
export interface TableRowSelection<TData> {
  /** 选择类型 */
  type?: 'checkbox' | 'radio'
  /** 选中的行键值 */
  selectedRowKeys?: (string | number)[]
  /** 选择改变回调 */
  onChange?: (selectedRowKeys: (string | number)[], selectedRows: TData[]) => void
  /** 获取行的禁用状态 */
  getCheckboxProps?: (record: TData) => { disabled?: boolean }
}

/**
 * 可展开配置
 */
export interface TableExpandable<TData> {
  /** 展开的行键值 */
  expandedRowKeys?: (string | number)[]
  /** 展开行渲染 */
  expandedRowRender?: (record: TData) => ReactNode
  /** 行是否可展开 */
  rowExpandable?: (record: TData) => boolean
  /** 展开改变回调 */
  onExpandedRowsChange?: (expandedRows: (string | number)[]) => void
}

/**
 * Table 组件属性接口
 * 提供 Ant Design Table 兼容的 API
 */
export interface TableProps<TData = Record<string, unknown>> {
  /** 列配置 */
  columns: TableColumn<TData>[]
  /** 数据源 */
  dataSource: TData[]
  /** 行键值 */
  rowKey?: string | ((record: TData) => string | number)
  /** 加载状态 */
  loading?: boolean
  /** 表格尺寸 */
  size?: TableSize
  /** 是否显示边框 */
  bordered?: boolean
  /** 分页配置 */
  pagination?: TablePagination | false
  /** 行选择配置 */
  rowSelection?: TableRowSelection<TData>
  /** 可展开配置 */
  expandable?: TableExpandable<TData>
  /** 排序改变回调 */
  onChange?: (
    pagination: { current: number; pageSize: number },
    sorter: { field?: string; order?: 'ascend' | 'descend' }
  ) => void
  /** 空数据展示 */
  locale?: { emptyText?: ReactNode }
  /** 表格标题 */
  title?: () => ReactNode
  /** 表格页脚 */
  footer?: () => ReactNode
  /** 行类名 */
  rowClassName?: string | ((record: TData, index: number) => string)
  /** 行点击事件 */
  onRow?: (record: TData, index: number) => { onClick?: () => void; onDoubleClick?: () => void }
  /** 滚动配置 */
  scroll?: { x?: number | string; y?: number | string }
  /** 自定义类名 */
  className?: string
  /** 是否显示表头 */
  showHeader?: boolean
  /** 表格布局 */
  tableLayout?: 'auto' | 'fixed'
}

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<TableSize, { cell: string; header: string }> = {
  small: { cell: 'px-2 py-1 text-xs', header: 'px-2 py-1.5 text-xs' },
  middle: { cell: 'px-4 py-2 text-sm', header: 'px-4 py-3 text-sm' },
  large: { cell: 'px-4 py-3 text-base', header: 'px-4 py-4 text-base' },
}

/**
 * 获取行键值
 */
function getRowKey<TData>(
  record: TData,
  rowKey: string | ((record: TData) => string | number) | undefined,
  index: number
): string | number {
  if (typeof rowKey === 'function') {
    return rowKey(record)
  }
  if (typeof rowKey === 'string' && record && typeof record === 'object') {
    return (record as Record<string, unknown>)[rowKey] as string | number
  }
  return index
}

/**
 * 转换列配置为 TanStack 格式
 */
function convertColumns<TData>(
  columns: TableColumn<TData>[]
): ColumnDef<TData, unknown>[] {
  return columns.map((col) => {
    const { title, dataIndex, key, render, sorter, align, width, ...rest } = col
    
    const tanstackCol: ColumnDef<TData, unknown> = {
      ...rest,
      id: key || dataIndex || String(title),
      accessorKey: dataIndex,
      header: col.header ?? (({ column }) => (
        <div
          className={cn(
            'flex items-center gap-1',
            align === 'center' && 'justify-center',
            align === 'right' && 'justify-end',
            sorter && 'cursor-pointer select-none'
          )}
          onClick={sorter ? () => column.toggleSorting() : undefined}
        >
          <span>{title}</span>
          {sorter && (
            <span className="inline-flex flex-col">
              {column.getIsSorted() === 'asc' ? (
                <ChevronUpIcon className="w-4 h-4 text-primary-500" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDownIcon className="w-4 h-4 text-primary-500" />
              ) : (
                <ChevronUpDownIcon className="w-4 h-4 text-neutral-400" />
              )}
            </span>
          )}
        </div>
      )),
      cell: col.cell ?? (({ getValue, row }) => {
        const value = getValue()
        if (render) {
          return render(value, row.original, row.index)
        }
        return value as ReactNode
      }),
      enableSorting: !!sorter,
      sortingFn: typeof sorter === 'function'
        ? (rowA, rowB) => sorter(rowA.original, rowB.original)
        : 'auto',
      size: typeof width === 'number' ? width : undefined,
      meta: { align, width },
    }
    
    return tanstackCol
  })
}

/**
 * Table 表格组件
 * 
 * 基于 TanStack Table 实现的高性能表格，提供 Ant Design Table 兼容的 API。
 * 
 * @example
 * // 基础用法
 * <Table
 *   columns={[
 *     { title: '姓名', dataIndex: 'name' },
 *     { title: '年龄', dataIndex: 'age', sorter: true },
 *   ]}
 *   dataSource={data}
 *   rowKey="id"
 * />
 * 
 * // 带分页和选择
 * <Table
 *   columns={columns}
 *   dataSource={data}
 *   rowSelection={{
 *     selectedRowKeys,
 *     onChange: setSelectedRowKeys,
 *   }}
 *   pagination={{
 *     current: page,
 *     pageSize: 10,
 *     total: 100,
 *     onChange: setPage,
 *   }}
 * />
 */
export function Table<TData = Record<string, unknown>>({
  columns,
  dataSource,
  rowKey = 'id',
  loading = false,
  size = 'middle',
  bordered = false,
  pagination = { pageSize: 10, current: 1 },
  rowSelection,
  expandable,
  onChange,
  locale = { emptyText: '暂无数据' },
  title,
  footer,
  rowClassName,
  onRow,
  scroll,
  className,
  showHeader = true,
  tableLayout = 'auto',
}: TableProps<TData>) {
  // 排序状态
  const [sorting, setSorting] = useState<SortingState>([])
  
  // 筛选状态
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // 展开状态
  const [expanded, setExpanded] = useState<ExpandedState>({})
  
  // 行选择状态
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({})
  
  // 分页状态
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: (pagination && pagination.current ? pagination.current : 1) - 1,
    pageSize: pagination ? pagination.pageSize || 10 : 10,
  })

  // 转换列配置
  const tanstackColumns = useMemo(
    () => convertColumns(columns),
    [columns]
  )

  // 处理行选择变化
  const handleRowSelectionChange = useCallback(
    (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
      setRowSelectionState((old) => {
        const newState = typeof updater === 'function' ? updater(old) : updater
        
        if (rowSelection?.onChange) {
          const selectedKeys = Object.keys(newState).filter((k) => newState[k])
          const selectedRows = dataSource.filter((_, index) =>
            selectedKeys.includes(String(index))
          )
          const keys = selectedRows.map((row) =>
            getRowKey(row, rowKey, dataSource.indexOf(row))
          )
          rowSelection.onChange(keys, selectedRows)
        }
        
        return newState
      })
    },
    [rowSelection, dataSource, rowKey]
  )

  // 创建表格实例
  const table = useReactTable({
    data: dataSource,
    columns: tanstackColumns,
    state: {
      sorting,
      columnFilters,
      expanded,
      rowSelection: rowSelectionState,
      pagination: pagination !== false ? paginationState : undefined,
    },
    onSortingChange: (updater) => {
      setSorting(updater)
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      if (onChange && newSorting.length > 0) {
        onChange(
          { current: paginationState.pageIndex + 1, pageSize: paginationState.pageSize },
          { field: newSorting[0].id, order: newSorting[0].desc ? 'descend' : 'ascend' }
        )
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: setPaginationState,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination !== false ? getPaginationRowModel() : undefined,
    getExpandedRowModel: expandable ? getExpandedRowModel() : undefined,
    getRowId: (row, index) => String(getRowKey(row, rowKey, index)),
    manualPagination: pagination !== false && pagination.total !== undefined,
    pageCount: pagination !== false && pagination.total
      ? Math.ceil(pagination.total / (pagination.pageSize || 10))
      : undefined,
  })

  // 样式类
  const styles = sizeStyles[size]

  // 渲染分页
  const renderPagination = () => {
    if (pagination === false) return null
    
    const { pageIndex, pageSize } = paginationState
    const total = pagination.total ?? dataSource.length
    const pageCount = Math.ceil(total / pageSize)
    const currentPage = pageIndex + 1
    const startItem = pageIndex * pageSize + 1
    const endItem = Math.min((pageIndex + 1) * pageSize, total)

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
        {/* 总数显示 */}
        <div className="text-sm text-neutral-600">
          {pagination.showTotal
            ? typeof pagination.showTotal === 'function'
              ? pagination.showTotal(total, [startItem, endItem])
              : `共 ${total} 条`
            : `显示 ${startItem}-${endItem} 条，共 ${total} 条`}
        </div>

        {/* 分页控制 */}
        <div className="flex items-center gap-2">
          {/* 每页条数选择 */}
          {pagination.showSizeChanger && (
            <select
              value={pageSize}
              onChange={(e) => {
                const newPageSize = Number(e.target.value)
                setPaginationState({ pageIndex: 0, pageSize: newPageSize })
                pagination.onChange?.(1, newPageSize)
              }}
              className="h-8 px-2 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {(pagination.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
                <option key={size} value={size}>
                  {size} 条/页
                </option>
              ))}
            </select>
          )}

          {/* 分页按钮 */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => {
                table.setPageIndex(0)
                pagination.onChange?.(1, pageSize)
              }}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                table.previousPage()
                pagination.onChange?.(currentPage - 1, pageSize)
              }}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            <span className="px-3 text-sm">
              第 {currentPage} / {pageCount} 页
            </span>
            
            <button
              onClick={() => {
                table.nextPage()
                pagination.onChange?.(currentPage + 1, pageSize)
              }}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                table.setPageIndex(pageCount - 1)
                pagination.onChange?.(pageCount, pageSize)
              }}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleRightIcon className="w-5 h-5" />
            </button>
          </nav>

          {/* 快速跳转 */}
          {pagination.showQuickJumper && (
            <div className="flex items-center gap-1 text-sm">
              <span>跳至</span>
              <input
                type="number"
                min={1}
                max={pageCount}
                defaultValue={currentPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = Math.min(
                      Math.max(1, Number((e.target as HTMLInputElement).value)),
                      pageCount
                    )
                    table.setPageIndex(page - 1)
                    pagination.onChange?.(page, pageSize)
                  }
                }}
                className="w-14 h-8 px-2 text-center border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
              <span>页</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* 标题 */}
      {title && (
        <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          {title()}
        </div>
      )}

      {/* 表格容器 */}
      <div
        className={cn(
          'overflow-auto',
          scroll?.y && 'overflow-y-auto'
        )}
        style={{
          maxHeight: scroll?.y,
          maxWidth: scroll?.x,
        }}
      >
        {/* 加载遮罩 */}
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <Spin />
          </div>
        )}

        {/* 表格 */}
        <table
          className={cn(
            'w-full',
            tableLayout === 'fixed' && 'table-fixed',
            bordered && 'border border-neutral-200'
          )}
        >
          {/* 表头 */}
          {showHeader && (
            <thead className="bg-neutral-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {/* 选择列 */}
                  {rowSelection && (
                    <th
                      className={cn(
                        styles.header,
                        'font-medium text-neutral-600 text-left',
                        'border-b border-neutral-200',
                        bordered && 'border-r',
                        'w-12'
                      )}
                    >
                      {rowSelection.type !== 'radio' && (
                        <input
                          type="checkbox"
                          checked={table.getIsAllRowsSelected()}
                          onChange={table.getToggleAllRowsSelectedHandler()}
                          className="rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                        />
                      )}
                    </th>
                  )}
                  
                  {/* 展开列 */}
                  {expandable && (
                    <th
                      className={cn(
                        styles.header,
                        'font-medium text-neutral-600',
                        'border-b border-neutral-200',
                        bordered && 'border-r',
                        'w-12'
                      )}
                    />
                  )}
                  
                  {/* 数据列 */}
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        styles.header,
                        'font-medium text-neutral-600 text-left',
                        'border-b border-neutral-200',
                        bordered && 'border-r last:border-r-0'
                      )}
                      style={{
                        width: header.column.columnDef.size,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          )}

          {/* 表体 */}
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (rowSelection ? 1 : 0) +
                    (expandable ? 1 : 0)
                  }
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  {locale.emptyText}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => {
                const rowClassValue =
                  typeof rowClassName === 'function'
                    ? rowClassName(row.original, rowIndex)
                    : rowClassName

                const rowEvents = onRow?.(row.original, rowIndex)

                return (
                  <>
                    <tr
                      key={row.id}
                      className={cn(
                        'hover:bg-neutral-50 transition-colors',
                        row.getIsSelected() && 'bg-primary-50',
                        rowClassValue
                      )}
                      onClick={rowEvents?.onClick}
                      onDoubleClick={rowEvents?.onDoubleClick}
                    >
                      {/* 选择单元格 */}
                      {rowSelection && (
                        <td
                          className={cn(
                            styles.cell,
                            'border-b border-neutral-100',
                            bordered && 'border-r'
                          )}
                        >
                          <input
                            type={rowSelection.type || 'checkbox'}
                            checked={row.getIsSelected()}
                            disabled={
                              rowSelection.getCheckboxProps?.(row.original)?.disabled
                            }
                            onChange={row.getToggleSelectedHandler()}
                            className={cn(
                              'border-neutral-300 text-primary-500 focus:ring-primary-500',
                              rowSelection.type === 'radio' ? 'rounded-full' : 'rounded'
                            )}
                          />
                        </td>
                      )}

                      {/* 展开单元格 */}
                      {expandable && (
                        <td
                          className={cn(
                            styles.cell,
                            'border-b border-neutral-100',
                            bordered && 'border-r'
                          )}
                        >
                          {(!expandable.rowExpandable ||
                            expandable.rowExpandable(row.original)) && (
                            <button
                              onClick={() => row.toggleExpanded()}
                              className="p-1 rounded hover:bg-neutral-100"
                            >
                              {row.getIsExpanded() ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                      )}

                      {/* 数据单元格 */}
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as
                          | { align?: string; width?: number | string }
                          | undefined

                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              styles.cell,
                              'border-b border-neutral-100',
                              bordered && 'border-r last:border-r-0',
                              meta?.align === 'center' && 'text-center',
                              meta?.align === 'right' && 'text-right'
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>

                    {/* 展开行 */}
                    {expandable?.expandedRowRender && row.getIsExpanded() && (
                      <tr>
                        <td
                          colSpan={
                            columns.length +
                            (rowSelection ? 1 : 0) +
                            (expandable ? 1 : 0)
                          }
                          className="px-4 py-3 bg-neutral-50 border-b border-neutral-100"
                        >
                          {expandable.expandedRowRender(row.original)}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {renderPagination()}

      {/* 页脚 */}
      {footer && (
        <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50">
          {footer()}
        </div>
      )}
    </div>
  )
}

Table.displayName = 'Table'

export type { TanStackTable, Row, ColumnDef }

export default Table
