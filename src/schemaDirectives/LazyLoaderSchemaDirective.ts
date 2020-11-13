/* eslint-disable class-methods-use-this, fp/no-class, fp/no-this */

import {
  SchemaDirectiveVisitor,
} from '@graphql-tools/utils';
import {
  defaultFieldResolver,
  GraphQLField,
  GraphQLObjectType,
} from 'graphql';

const lazyLoaded = Symbol('LAZY_LOADED');

const wrapLazyLoadableField = (field: GraphQLField<any, any>, object: GraphQLObjectType) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const lazyLoad = object.lazyLoad;

  if (!lazyLoad) {
    return;
  }

  const resolve = field.resolve || defaultFieldResolver;

  field.resolve = async (node, args, context, info) => {
    if (!node[lazyLoaded]) {
      node[lazyLoaded] = lazyLoad(
        node,
        args,
        context,
        info,
      );
    }

    const newNode = await node[lazyLoaded];

    return resolve(
      newNode,
      args,
      context,
      info,
    );
  };
};

export default class LazyLoaderSchemaDirective extends SchemaDirectiveVisitor {
  public visitObject(object: GraphQLObjectType) {
    const fieldMap = object.getFields();

    for (const fieldName of Object.keys(fieldMap)) {
      wrapLazyLoadableField(fieldMap[fieldName], object);
    }
  }
}
