import { isArrayLikeObject } from "../../vendor/lodash";
import { getEditor } from "../tools";
import { getByPath, getCache, setCache, deleteCache, getNodeValue } from "../../utils";
import { getItemSchema } from "../../schemaUtils";

import ItemRender from "./item";

const ArrayReapeaterRender = (widget, options, editors) => {
    const {
        runtimeSchema,
        runtimeValueNode,
        rootRuntimeSchema,
        rootControlCache,
        valuePath,
        dataSource,
        valueUpdateTree,
        debugObj,
        debug,
    } = options;

    const value = getNodeValue(runtimeValueNode);
    if (!isArrayLikeObject(value)) {
        return;
    }

    if (debug) {
        debugObj.path = `${debugObj.path}/Array`;
        console.log("%c%s %cValue:%o", "color:green", debugObj.path, "color:blue", value);
    }

    const schemaItemsLen = isArrayLikeObject(runtimeSchema.items) ? runtimeSchema.items.length : 0;
    const arrayLength = value.length;
    const schemaOption = {
        orderable: true,
        addable: true,
        removable: true,
        ...(getByPath(runtimeSchema, "$vf_opt/option") || {}),
    };

    dataSource.children = [];
    for (let arrayIndex = 0; arrayIndex < arrayLength; arrayIndex++) {
        dataSource.children[arrayIndex] = {};
        const arrayIndexNext = arrayIndex + 1;
        const arrayIndexPrev = arrayIndex - 1;
        const itemSchema = getItemSchema(runtimeSchema, arrayIndex, rootRuntimeSchema);
        ItemRender(widget, {
            ...options,
            runtimeValueNode: { node: value, key: arrayIndex },
            runtimeSchema: itemSchema,
            parentRuntimeSchema: runtimeSchema,
            parentRuntimeValue: value,
            valueUpdateTree:
                valueUpdateTree && valueUpdateTree.children
                    ? valueUpdateTree.children.find(it => it.key === arrayIndex) || { update: true }
                    : { update: true },
            objectKey: null,
            arrayIndex,
            valuePath: `${valuePath}/${arrayIndex}`,
            handle: {
                canMoveUp: schemaOption.orderable && arrayIndex > schemaItemsLen && arrayIndex !== 0,
                canMoveDown:
                    schemaOption.orderable && arrayIndexNext > schemaItemsLen && arrayIndexNext !== arrayLength,
                canRemove:
                    schemaOption.removable &&
                    arrayIndexNext > schemaItemsLen &&
                    (!Number.isInteger(runtimeSchema.minItems) || runtimeSchema.minItems < arrayLength),
                canAppend:
                    schemaOption.appendable &&
                    (!Number.isInteger(runtimeSchema.maxItems) || runtimeSchema.maxItems > arrayLength),
                onChange: (val, opt) => {
                    value[arrayIndex] = val;
                    options.handle.onChange(value, opt);
                },
                moveUp: () => {
                    if (arrayIndex === 0) {
                        return;
                    }

                    // schema
                    const a = getCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndex}`);
                    const b = getCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndexPrev}`);
                    if (a) {
                        deleteCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndexPrev}`);
                        setCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndexPrev}`, a);
                    }
                    if (b) {
                        deleteCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndex}`);
                        setCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndex}`, b);
                    }

                    // value
                    const temp = value[arrayIndex];
                    value[arrayIndex] = value[arrayIndexPrev];
                    value[arrayIndexPrev] = temp;
                    options.handle.onChange(value, { formUpdate: "moveUp" });
                },
                moveDown: () => {
                    if (arrayIndex === value.length - 1) {
                        return;
                    }

                    // schema
                    const a = getCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndex}`);
                    const b = getCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndexNext}`);
                    if (a) {
                        deleteCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndexNext}`);
                        setCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndexNext}`, a);
                    }
                    if (b) {
                        deleteCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndex}`);
                        setCache(rootControlCache, "valuePath", `${valuePath}/${arrayIndex}`, b);
                    }

                    // value
                    const temp = value[arrayIndex];
                    value[arrayIndex] = value[arrayIndexNext];
                    value[arrayIndexNext] = temp;
                    options.handle.onChange(value, { formUpdate: "moveDown" });
                },
                remove: () => {
                    // schema
                    for (let i = arrayIndex + 1; i < value.length; i++) {
                        const obj = getCache(rootControlCache, "valuePath", `${valuePath}/${i}`);
                        deleteCache(rootControlCache, "valuePath", `${valuePath}/${i - 1}`);
                        if (obj) {
                            setCache(rootControlCache, "valuePath", `${valuePath}/${i - 1}`, obj);
                        }
                    }
                    // value
                    value.splice(arrayIndex, 1);
                    options.handle.onChange(value, { formUpdate: "remove" });
                },
            },
            schemaOption,
            dataSource: dataSource.children[arrayIndex],
            // using for custom array child widgetShcema
            widgetForChild: getEditor(editors, arrayIndex),
            ...(debug ? { debugObj: { ...debugObj, path: `${debugObj.path}[${arrayIndex}]` } } : {}),
        });
    }
};

export default ArrayReapeaterRender;
