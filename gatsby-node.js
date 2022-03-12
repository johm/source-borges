const { ApolloClient, HttpLink,InMemoryCache, gql} = require("@apollo/client")
const fetch = require("cross-fetch")


/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 */
// You can delete this file if you're not using it

/**
 * You can uncomment the following line to verify that
 * your plugin is being loaded in your site.
 *
 * See: https://www.gatsbyjs.com/docs/creating-a-local-plugin/#developing-a-local-plugin-that-is-outside-your-project
 */
exports.onPreInit = () => console.log("Loaded gatsby-source-borges")



const TITLE_NODE_TYPE = `Title`
const EDITION_NODE_TYPE = `Edition`
const CATEGORY_NODE_TYPE = `Category`
const TITLELIST_NODE_TYPE = `Titlelist`
const AUTHOR_NODE_TYPE = `Author`


const client = new ApolloClient({
    link: new HttpLink({ uri:"http://192.168.1.56:3000/graphql", fetch }),
    cache: new InMemoryCache(),
})


exports.sourceNodes = async ({
  actions,
  createContentDigest,
  createNodeId,
    getNodesByType,
    cache,
}) => {
    const { createNode } = actions

    const categoriesSet=new Set();
    const authorsSet=new Set();
    const titlelistsSet=new Set();
    
    const updated_at = await cache.get(`timestamp`)



    const { data } = await client.query({
	variables: { updated_at: updated_at },
	query: 		   gql`
	    query GetBorges($updated_at: ISO8601DateTime) {
		titles (updatedAt: $updated_at) {
		    id
		    key
		    title
		    slug
		    updatedAt
		    editions {
			id
			key
			cover_image_url
			opengraph_image_url
			list_price
			isbn13
			year_of_publication
			publisherName
		    }
		    
		    latest_published_edition {
			id
			key
			cover_image_url
			opengraph_image_url
			list_price
			isbn13
			year_of_publication
			publisherName
		    }
		    
		    contributions {
			author {
			    id 
			    key
			    slug
			    fullName
			}
			what
		    }
		    
		    categories {
			id
			key
			name
			description
			slug
			image_url
		    }

		    titlelists {
			id
			key
			name
			description
			slug
		    }
		}
	    }
	`
    })

    
    
    // loop through data and create Gatsby nodes
    data.titles.forEach(title =>
	{ createNode({
	    ...title,
	    id: createNodeId(`${TITLE_NODE_TYPE}-${title.id}`),
	    parent: null,
	    children: [],
	    internal: {
		type: TITLE_NODE_TYPE,
		content: JSON.stringify(title),
		contentDigest: createContentDigest(title),
	    },
	})
	    title.categories.forEach(category =>
		categoriesSet.add(category)
	    )
	    title.contributions.forEach(c =>
		authorsSet.add(c.author)
	    )
	    title.titlelists.forEach(titlelist =>
		titlelistsSet.add(titlelist)
	    )


	}
    )
    
    
    Array.from(categoriesSet).forEach(category =>
	createNode({
	    ...category,
	    id: createNodeId(`${CATEGORY_NODE_TYPE}-${category.id}`),
	    parent: null,
	    children: [],
	    internal: {
		type: CATEGORY_NODE_TYPE,
		content: JSON.stringify(category),
		contentDigest: createContentDigest(category),
	    },
	})
    )

    Array.from(titlelistsSet).forEach(titlelist =>
	createNode({
	    ...titlelist,
	    id: createNodeId(`${TITLELIST_NODE_TYPE}-${titlelist.id}`),
	    parent: null,
	    children: [],
	    internal: {
		type: TITLELIST_NODE_TYPE,
		content: JSON.stringify(titlelist),
		contentDigest: createContentDigest(titlelist),
	    },
	})
    )

    
    Array.from(authorsSet).forEach(author =>
	createNode({
	    ...author,
	    id: createNodeId(`${AUTHOR_NODE_TYPE}-${author.id}`),
	    parent: null,
	    children: [],
	    internal: {
		type: AUTHOR_NODE_TYPE,
		content: JSON.stringify(author),
		contentDigest: createContentDigest(author),
	    },
	})
    )

    return
    
}


exports.createResolvers = ({ createResolvers }) => {
    const resolvers = {
	Category: {
	    titles: {
		type: ["Title"],
		resolve: async (source, args, context, info) => {
		    const { entries } = await context.nodeModel.findAll({
			query: {
			    filter: {
				categories: {elemMatch: {key: {eq: source.key}}}
			    },
			},
			type: "Title",
		    })
		    return entries
		},
	    },
	},
	Titlelist: {
	    titles: {
		type: ["Title"],
		resolve: async (source, args, context, info) => {
		    const { entries } = await context.nodeModel.findAll({
			query: {
			    filter: {
				titlelists: {elemMatch: {key: {eq: source.key}}}
			    },
			},
			type: "Title",
		    })
		    return entries
		},
	    },
	},
	TitleTitlelists: {
	    titles: {
		type: ["Title"],
		resolve: async (source, args, context, info) => {
		    const { entries } = await context.nodeModel.findAll({
			query: {
			    filter: {
				titlelists: {elemMatch: {key: {eq: source.key}}}
			    },
			},
			type: "Title",
		    })
		    return entries
		},
	    },
	},
	Author: {
	    titles: {
		type: ["Title"],
		resolve: async (source, args, context, info) => {
		    const { entries } = await context.nodeModel.findAll({
			query: {
			    filter: {
				contributions: {elemMatch: {author: {key: {eq: source.key}}}}
			    },
			},
			type: "Title",
		    })
		    return entries
		},
	    },
	},
	TitleContributionsAuthor: {
	    titles: {
		type: ["Title"],
		resolve: async (source, args, context, info) => {
		    const { entries } = await context.nodeModel.findAll({
			query: {
			    filter: {
				contributions: {elemMatch: {author: {key: {eq: source.key}}}}
			    },
			},
			type: "Title",
		    })
		    return entries
		},
	    },
	},   
    }
    createResolvers(resolvers)
}



exports.onPostBuild = async ({ cache }) => {
    // set a timestamp at the end of the build
    await cache.set(`timestamp`, Date.now())
}
