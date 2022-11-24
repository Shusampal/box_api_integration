class BoxFolderTreeBuilder {
    constructor(boxClient, options) {
        options = options || {};
        boxClient._useIterators = true;
        this.boxClient = boxClient;
        this.maxDepth = options.maxDepth || -1;
        this.rootFolderId = options.rootFolderId || "0";
    }

    async buildFolderTreeWithFlatLists() {
        let tree = {
            rootId: this.rootFolderId,
            folders: [],
            files: []
        }
        let folderItemsIterator = await this.boxClient.folders.getItems(this.rootFolderId);
        let collection = await BoxUtilities.autoPage(folderItemsIterator);
        let rootFolderChildren = [];

        const path = `${this.rootFolderId}`;
        collection.forEach((item) => {
            if (item.type === "file") {
                tree.files.push({
                    item,
                    path
                })
            } else if (item.type === "folder") {
                let folderTreeFolder = {
                    item,
                    path,
                    children: []
                }
                tree.folders.push(folderTreeFolder);
                rootFolderChildren.push(folderTreeFolder);
            }
        });
        tree = await this.dive(tree, rootFolderChildren, 1);
        return tree;
    }

    async dive(tree, children, currentDepth) {
        if (this.inTooDeep(currentDepth)) {
            return tree;
        } else {
            currentDepth++;
            let additionalChildren = [];
            let childrenPromises = [];
            children.forEach((child) => {
                let foundFolder = -1;
                childrenPromises.push(this.boxClient.folders.getItems(child.item.id)
                    .then((folderItemsIterator) => {
                        return BoxUtilities.autoPage(folderItemsIterator)
                            .then((collection) => {
                                for (let i = 0; i < tree.folders.length; i++) {
                                    if (child.item.id === tree.folders[i].item.id) {
                                        foundFolder = i;
                                    }
                                }

                                const path = `${child.path}/${child.item.id}`;
                                collection.forEach((item) => {
                                    if (foundFolder >= 0) {
                                        tree.folders[foundFolder].children.push(item);
                                    }

                                    if (item.type === "file") {
                                        tree.files.push({
                                            item,
                                            path
                                        })
                                    } else if (item.type === "folder") {
                                        let folderTreeFolder = {
                                            item,
                                            path,
                                            children: []
                                        }
                                        tree.folders.push(folderTreeFolder);
                                        additionalChildren.push(folderTreeFolder);
                                    }
                                });
                                return;
                            });
                    }));
            });
            await Promise.all(childrenPromises);
            if (additionalChildren.length === 0) {
                return tree;
            } else {
                return this.dive(tree, additionalChildren, currentDepth);
            }
        }
    }

    inTooDeep(depthCount) {
        if (this.maxDepth < 0) {
            return false;
        } else {
            return (depthCount >= this.maxDepth);
        }
    }
}

class BoxUtilities {
    static async autoPage(iterator, collection = []) {
        let moveToNextItem = async () => {
            let item = await iterator.next();
            if (item.value) {
                collection.push(item.value);
            }

            if (item.done !== true) {
                return moveToNextItem();
            } else {
                return collection;
            }
        }
        return moveToNextItem();
    }
}

module.exports.BoxFolderTreeBuilder = BoxFolderTreeBuilder