// "use client";

// import { type LookupItem, SearchLookup } from "@/components/ui/search-lookup";
// import { FormBase, type FormFieldProps } from "./form-base";
// import { useFieldContext } from "./hooks";

// type FormSearchLookupFieldBaseProps = FormFieldProps & {
//     items: LookupItem[];
//     placeholder?: string;
//     emptyText?: string;
//     loading?: boolean;
//     onSearch?: (query: string) => void;
//     minChars?: number;
// };

// type FormSearchLookupSingleProps = FormSearchLookupFieldBaseProps & {
//     multiple?: false;
// };

// type FormSearchLookupMultiProps = FormSearchLookupFieldBaseProps & {
//     multiple: true;
// };

// type FormSearchLookupFieldProps =
//     | FormSearchLookupSingleProps
//     | FormSearchLookupMultiProps;

// export function FormSearchLookupField({
//     items,
//     placeholder,
//     emptyText,
//     loading,
//     onSearch,
//     minChars,
//     multiple,
//     ...props
// }: FormSearchLookupFieldProps) {
//     if (multiple) {
//         return (
//             <FormSearchLookupMultiInner
//                 emptyText={emptyText}
//                 items={items}
//                 loading={loading}
//                 minChars={minChars}
//                 onSearch={onSearch}
//                 placeholder={placeholder}
//                 {...props}
//             />
//         );
//     }

//     return (
//         <FormSearchLookupSingleInner
//             emptyText={emptyText}
//             items={items}
//             loading={loading}
//             minChars={minChars}
//             onSearch={onSearch}
//             placeholder={placeholder}
//             {...props}
//         />
//     );
// }

// function FormSearchLookupSingleInner({
//     items,
//     placeholder,
//     emptyText,
//     loading,
//     onSearch,
//     minChars,
//     ...props
// }: FormSearchLookupFieldBaseProps) {
//     const field = useFieldContext<string | null>();

//     return (
//         <FormBase {...props}>
//             <SearchLookup
//                 emptyText={emptyText}
//                 items={items}
//                 loading={loading}
//                 minChars={minChars}
//                 onSearch={onSearch}
//                 onValueChange={field.handleChange}
//                 placeholder={placeholder}
//                 value={field.state.value}
//             />
//         </FormBase>
//     );
// }

// function FormSearchLookupMultiInner({
//     items,
//     placeholder,
//     emptyText,
//     loading,
//     onSearch,
//     minChars,
//     ...props
// }: FormSearchLookupFieldBaseProps) {
//     const field = useFieldContext<string[]>();

//     return (
//         <FormBase {...props}>
//             <SearchLookup
//                 emptyText={emptyText}
//                 items={items}
//                 loading={loading}
//                 minChars={minChars}
//                 multiple
//                 onSearch={onSearch}
//                 onValueChange={field.handleChange}
//                 placeholder={placeholder}
//                 value={field.state.value}
//             />
//         </FormBase>
//     );
// }
