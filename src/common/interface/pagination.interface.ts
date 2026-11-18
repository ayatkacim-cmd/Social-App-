export interface IPaginate<T> {
    data: T[];
    meta: {
        count: number;
        totalPages: number;
        currentPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        
    }
}